/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication 관련 API
 */

import express, { Request, Response } from 'express';
import { sign, verifyVmeetingJWT } from '../../libs/auth';
import { User } from '../../libs/mongo';
import { ErrorType } from '../../libs/types';

const router = express.Router();

interface LoginReqBody {
  vmeetingToken: string;
}

interface LoginResBody {
  token?: string;
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /auth/login:
 *    post:
 *      tags: [Auth]
 *      description: 로그인
 *      produces:
 *        - "application/json"
 *      requestBody:
 *        description: Token
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: "object"
 *              properties:
 *                vmeetingToken:
 *                  type: "string"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  token:
 *                    type: "string"
 *        400:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  error:
 *                    type: "array"
 *                    items:
 *                      type: "object"
 *                      properties:
 *                        type:
 *                          type: "string"
 *                          enum:
 *                            - INVALID_INPUT
 *                            - INPUT_NOT_EXIST
 *                        target:
 *                          type: "string"
 *                        message:
 *                          type: "string"
 *        500:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  error:
 *                    type: "array"
 *                    items:
 *                      type: "object"
 *                      properties:
 *                        type:
 *                          type: "string"
 *                          enum:
 *                            - SERVER_ERROR
 *                        target:
 *                          type: "string"
 *                          value: "internal"
 *                        message:
 *                          type: "string"
 */
router.post(
  '/login',
  async (req: Request<unknown, LoginResBody, LoginReqBody>, res: Response<LoginResBody, unknown>) => {
    const { vmeetingToken } = req.body;
    // 1. validation check
    if (!vmeetingToken) {
      res.status(400).json({
        error: [
          {
            type: 'INPUT_NOT_EXIST',
            target: 'vmeetingToken',
          },
        ],
      });
      return;
    }
    // 2. verifyVmeetingJWT
    const payload = verifyVmeetingJWT(vmeetingToken);
    if (!payload) {
      res.status(400).json({
        error: [
          {
            type: 'INVALID_INPUT',
            target: 'vmeetingToken',
            message: 'this is not valid token',
          },
        ],
      });
      return;
    }
    const vmeetingId = payload.context.user.id;
    const vmeetingName = payload.context.user.name;
    try {
      // 3. check user exist in db.
      const users = await User.find({ vmeetingId });
      let userId: string;
      let userName: string;
      if (users.length === 0) {
        const newUser = await User.create({
          name: vmeetingName,
          language: 'ko',
          avatarSrc: undefined,
          vmeetingId,
        });
        userId = newUser._id.toHexString();
        userName = newUser.name;
      }
      // 3-2. if not exist, then create a user.
      else {
        userId = users[0]._id.toHexString();
        userName = vmeetingName;
        if (users[0].name !== vmeetingName) {
          await User.updateOne(
            {
              _id: userId,
            },
            {
              name: vmeetingName,
            },
          );
        }
      } // 4. sign jwt
      const jwt = sign(userId, userName, vmeetingId, vmeetingToken);
      // 5. send jwt
      res.json({
        token: jwt,
      });
      return;
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
      return;
    }
  },
);

export default router;
