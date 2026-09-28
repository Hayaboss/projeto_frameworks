const express = require("express");
const alunoController = require("../controllers/AlunoController");
const validarAluno = require("../middlewares/validarAluno");
const validarAlunoUpdate = require("../middlewares/validarAlunoUpdate");

const router = express.Router();

router.get("/",(request, response, next)=>{
    console.log("Executando antes do findMany");
    next();
}, alunoController.findMany);
router.get("/:id", alunoController.findUnique);
router.post("/", validarAluno, alunoController.create);
router.put("/:id", validarAlunoUpdate, alunoController.update);
router.patch("/:id", validarAlunoUpdate, alunoController.update);
router.delete("/:id", alunoController.delete);

module.exports = router;