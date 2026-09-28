const prisma = require("../databases/prisma");
const AlunoInvalidoError = require("../errors/AlunoInvalidoError");
const AlunoNaoEncontradoError = require("../errors/AlunoNaoEncontradoError");
const EmailDuplicadoError = require("../errors/EmailDuplicadoError");

// Campos do model Aluno pelos quais é permitido ordenar.
// Usar uma lista fixa evita que o cliente envie um campo inexistente
// (o que faria o Prisma lançar um erro) ou qualquer valor inesperado.
const CAMPOS_ORDENACAO = ["id", "nome", "email", "createdAt", "updatedAt"];
const DIRECOES_ORDENACAO = ["asc", "desc"];

class AlunoService{

    async findMany(page, pageSize, orderBy = "id", order = "asc"){
        // Valores fora da lista permitida resultam em erro 400 (e não em erro 500 do Prisma)
        if(!CAMPOS_ORDENACAO.includes(orderBy)){
            throw new AlunoInvalidoError(
                `orderBy inválido. Use um destes campos: ${CAMPOS_ORDENACAO.join(", ")}`,
                400
            );
        }
        if(!DIRECOES_ORDENACAO.includes(order)){
            throw new AlunoInvalidoError(
                `order inválido. Use "asc" ou "desc"`,
                400
            );
        }

        // Garante números inteiros positivos para a paginação
        page = Number(page);
        pageSize = Number(pageSize);
        if(!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1){
            throw new AlunoInvalidoError("page e pageSize devem ser números inteiros maiores que zero", 400);
        }

        //SELECT * FROM alunos ORDER BY <orderBy> <order> LIMIT ... OFFSET ...
        //SELECT COUNT(*) FROM alunos  (total geral, sem considerar a paginação)
        const [alunos, total] = await Promise.all([
            prisma.aluno.findMany({
                skip: (page-1)*pageSize,
                take: pageSize,
                orderBy: { [orderBy]: order }
            }),
            prisma.aluno.count()
        ]);

        return { alunos, total };
    }

    async findUnique(id){
        // O id chega da URL como texto (request.params), mas no schema é Int
        const idNumerico = Number(id);
        if(!Number.isInteger(idNumerico) || idNumerico < 1){
            throw new AlunoInvalidoError("Id inválido. Informe um número inteiro maior que zero", 400);
        }

        //SELECT * FROM alunos WHERE id = ?
        const aluno = await prisma.aluno.findUnique({
            where: { id: idNumerico }
        });

        // findUnique devolve null quando não encontra
        if(!aluno){
            throw new AlunoNaoEncontradoError();
        }

        return aluno;
    }

    async update(id, dados){
        /*
         * Decisão sobre as exceções deste método:
         * - Aluno não encontrado: reaproveita AlunoNaoEncontradoError (404), criada no findUnique,
         *   pois é exatamente o mesmo problema.
         * - Dados inválidos (corpo vazio / sem campo válido): reaproveita AlunoInvalidoError (400),
         *   pois continua sendo "dados do aluno inválidos"; só muda a mensagem.
         * - Email duplicado: cria EmailDuplicadoError (409 Conflict), pois é um erro de natureza
         *   diferente (o dado é válido, mas conflita com outro registro) e o status HTTP correto
         *   também é diferente de 400 e de 404.
         */
        const {nome, email} = dados || {};

        // Só atualiza os campos realmente enviados (nome e/ou email)
        const data = {};
        if(nome !== undefined) data.nome = nome;
        if(email !== undefined) data.email = email;

        if(Object.keys(data).length === 0){
            throw new AlunoInvalidoError("Informe ao menos um campo válido para atualizar (nome ou email)", 400);
        }

        // Valida o id e lança AlunoNaoEncontradoError se o aluno não existir
        const alunoAtual = await this.findUnique(id);

        // Se o email mudou, verifica se ele já pertence a OUTRO aluno
        if(data.email !== undefined && data.email !== alunoAtual.email){
            const outroAluno = await prisma.aluno.findUnique({ where: { email: data.email } });
            if(outroAluno && outroAluno.id !== alunoAtual.id){
                throw new EmailDuplicadoError();
            }
        }

        try{
            //UPDATE alunos SET ... WHERE id = ?
            const alunoAtualizado = await prisma.aluno.update({
                where: { id: alunoAtual.id },
                data
            });
            return alunoAtualizado;
        }catch(e){
            // Rede de segurança: entre a verificação acima e o update, outro usuário pode ter
            // gravado o mesmo email (P2002 = violação de @unique) ou removido o aluno (P2025).
            if(e.code === "P2002") throw new EmailDuplicadoError();
            if(e.code === "P2025") throw new AlunoNaoEncontradoError();
            throw e;
        }
    }

    async delete(id){
        // Valida o id e lança AlunoNaoEncontradoError se o aluno não existir
        const aluno = await this.findUnique(id);

        try{
            //DELETE FROM alunos WHERE id = ?
            await prisma.aluno.delete({
                where: { id: aluno.id }
            });
        }catch(e){
            // Rede de segurança: se outro usuário removeu o aluno entre a verificação e o delete,
            // o Prisma lança P2025 (registro não encontrado)
            if(e.code === "P2025") throw new AlunoNaoEncontradoError();
            throw e;
        }
    }

    async create(aluno){
        const {nome, email} = aluno;
        if(!nome || !email){
            throw new AlunoInvalidoError();
        }
        //create = insert
        //update = update
        //delete = delete
        //findMany = select * from
        const novoAluno = await prisma.aluno.create({data:aluno});

        return novoAluno;
    }
}

module.exports = new AlunoService();
