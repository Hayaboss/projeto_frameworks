const prisma = require("../databases/prisma");
const AlunoInvalidoError = require("../errors/AlunoInvalidoError");

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
