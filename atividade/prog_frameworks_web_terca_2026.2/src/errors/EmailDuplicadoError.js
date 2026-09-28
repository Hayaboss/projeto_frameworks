const ApiError = require("./ApiError");

class EmailDuplicadoError extends ApiError{
    constructor(message="Já existe um aluno cadastrado com este email", statusCode=409){
        super(message, statusCode);
    }
}

module.exports = EmailDuplicadoError;
