const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

// Only add exception/rejection handlers once globally
if (!global._loggerHandlersAdded) {
  logger.exceptions.handle(
    new transports.File({ filename: path.join(__dirname, '../../logs/exceptions.log') })
  );
  logger.rejections.handle(
    new transports.File({ filename: path.join(__dirname, '../../logs/rejections.log') })
  );
  global._loggerHandlersAdded = true;
}

module.exports = logger; 