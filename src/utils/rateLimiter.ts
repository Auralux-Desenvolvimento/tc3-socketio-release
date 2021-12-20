import { RateLimiterMemory } from 'rate-limiter-flexible';
import { MiddlewareParam } from '../types/Middleware';

const limiter = new RateLimiterMemory({
  duration: 1,
  points: 5
});

const rateLimiter: MiddlewareParam = async (socket, next) => {
  try {
    await limiter.consume(socket.handshake.address);
  } catch (error) {
    next(new Error("Too Many Requests"));
  }
  next();
}

export default rateLimiter;