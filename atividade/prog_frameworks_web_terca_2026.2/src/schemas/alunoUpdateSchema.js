const alunoSchema = require("./alunoSchema");

// Versão para atualização: nome e email são opcionais (pode-se alterar só um deles)
const alunoUpdateSchema = alunoSchema.partial();

module.exports = alunoUpdateSchema;
