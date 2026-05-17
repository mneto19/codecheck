// Script de seed para popular a base de dados com dados de teste
// Executar com: npm run db:seed

require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./client");
const { generateRoomCode } = require("../utils/roomCode");

async function main() {
  console.log("A criar dados de teste...");

  // Limpa dados existentes (cuidado: apaga tudo)
  await prisma.submission.deleteMany();
  await prisma.student.deleteMany();
  await prisma.question.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  // Cria docente de exemplo
  const passwordHash = await bcrypt.hash("teste1234", 12);
  const docente = await prisma.user.create({
    data: {
      name: "Professor Demo",
      email: "demo@codecheck.pt",
      passwordHash,
    },
  });
  console.log(`Docente criado: ${docente.email} (password: teste1234)`);

  // Cria sala de exemplo com perguntas
  const room = await prisma.room.create({
    data: {
      code: generateRoomCode(),
      name: "Prova de Programação - Demo",
      teacherId: docente.id,
      timerSeconds: 1800, // 30 minutos
      questions: {
        create: [
          {
            promptText: "Escreve uma função que recebe uma lista de números e devolve a soma de todos os elementos.",
            referenceCode: "def soma_lista(numeros):\n    return sum(numeros)\n\n# Teste\nprint(soma_lista([1, 2, 3, 4, 5]))",
            language: "PYTHON",
            orderIndex: 0,
          },
          {
            promptText: "Escreve uma função que verifica se uma palavra é um palíndromo.",
            referenceCode: "def eh_palindromo(palavra):\n    palavra = palavra.lower()\n    return palavra == palavra[::-1]\n\n# Teste\nprint(eh_palindromo('arara'))",
            language: "PYTHON",
            orderIndex: 1,
          },
          {
            promptText: "Implementa a função fatorial recursivamente.",
            referenceCode: "def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)\n\n# Teste\nprint(fatorial(5))",
            language: "PYTHON",
            orderIndex: 2,
          },
        ],
      },
    },
  });

  console.log(`Sala criada: ${room.name} (código: ${room.code})`);
  console.log("Seed concluído com sucesso.");
}

main()
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
