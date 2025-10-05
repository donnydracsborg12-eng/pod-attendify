import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const logAuditEvent = async (
  userId: string,
  action: string,
  tableName: string,
  recordId?: string,
  oldData?: any,
  newData?: any
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        tableName,
        recordId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

export const auditMiddleware = (action: string, tableName: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Log audit event after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const recordId = req.params.id || req.body?.id;
        logAuditEvent(
          req.user.id,
          action,
          tableName,
          recordId,
          req.oldData,
          req.body
        );
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
