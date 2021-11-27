import { logger } from '../../utils/logger';

export class MessageApi {
  asyncMessage(event: any, arg: any) {
    event.sender.send('asynchronous-reply', arg);
  }
  syncMessage(arg: any) {
    logger.info(arg);
    return 'main-process pong message';
  }
}
