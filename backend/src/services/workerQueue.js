const { executeCode } = require("./codeExecutionService");
const { getIO } = require("./socketService");
const prisma = require("../prisma/client");

const queue = [];
let processing = false;
const MAX_CONCURRENT = 3;
let active = 0;

async function processJob(job) {
  const { submissionId, studentCode, language, studentId, questionId, roomId } = job;

  let execution;
  try {
    execution = await executeCode(studentCode, language);
  } catch (e) {
    console.error(`Execução de código falhou para submissão ${submissionId}:`, e.message);
    await prisma.submission.update({
      where: { id: submissionId },
      data: { executionStatus: "Error" },
    }).catch(() => {});
    const io = getIO();
    io.to(`student:${studentId}`).emit("submission:result", {
      questionId,
      status: "Error",
      output: `Erro ao executar código: ${e.message}`,
    });
    if (roomId) io.to(`teacher:${roomId}`).emit("submission:progress", {
      studentId, questionId, status: "Error",
    });
    return;
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      executionOutput: execution.stdout || null,
      executionError: execution.stderr || null,
      executionStatus: execution.status,
    },
  }).catch(() => {});

  const io = getIO();
  io.to(`student:${studentId}`).emit("submission:result", {
    questionId,
    status: execution.status,
    output: execution.stdout || execution.stderr || "",
  });
  if (roomId) io.to(`teacher:${roomId}`).emit("submission:progress", {
    studentId, questionId, status: execution.status,
  });
}

async function drain() {
  if (processing) return;
  processing = true;
  while (queue.length > 0 && active < MAX_CONCURRENT) {
    const job = queue.shift();
    active++;
    processJob(job).finally(() => {
      active--;
      drain();
    });
  }
  processing = false;
}

function enqueue(job) {
  queue.push(job);
  drain();
}

module.exports = { enqueue };
