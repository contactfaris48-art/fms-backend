import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userInfo?: any;
    nonce?: string;
    state?: string;
  }
}

declare module 'express' {
  interface Request {
    isAuthenticated?: boolean;
  }
}
