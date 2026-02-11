// Tratamento global de erros

// Classe de erro customizada com status HTTP
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Middleware de tratamento de erros do Express
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  console.error(`[ERRO ${status}] ${req.method} ${req.url} - ${message}`);

  const response = { erro: message };

  // Em desenvolvimento, inclui stack trace
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = { AppError, errorHandler };
