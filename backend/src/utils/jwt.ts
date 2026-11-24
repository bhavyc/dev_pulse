import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  teamId?: string;
}

export const signToken = (payload: JwtPayload, expiresIn = env.JWT_EXPIRES_IN): string => {
  const options: SignOptions = {
    expiresIn: expiresIn as unknown as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
