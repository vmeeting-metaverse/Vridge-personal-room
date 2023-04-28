/**
 * @swagger
 * tags:
 *   name: Space
 *   description: Space 관련 API
 * definitions:
 *   Space:
 *     type: object
 *     properties:
 *       id:
 *         type: string
 *         required: true
 *       typeId:
 *         type: string
 *         required: true
 *       name:
 *         type: string
 *         required: true
 *       password:
 *         type: string
 *       privateYN:
 *         type: boolean
 *         required: true
 *       lobbyYN:
 *         type: boolean
 *         required: true
 *       ownerId:
 *         type: string
 *         required: true
 *       inviteLink:
 *         type: string
 *       notice:
 *         type: string
 *       openMediaBoardYN:
 *         type: boolean
 *         required: true
 *       openPlatformYN:
 *         type: boolean
 *         required: true
 *       useYN:
 *         type: boolean
 *         required: true
 */

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Participate, Space, spaceSchema, SpaceType, User } from '../../libs/mongo';
import { ErrorType } from '../../libs/types';
import { UserRes } from '../users';

const router = express.Router();

interface SpaceRes {
  id: string;
  typeId: string;
  name: string;
  isPersonal: boolean;
  privateYN: boolean;
  lobbyYN: boolean;
  ownerId: string;
  notice?: string;
  inviteLink?: string;
  mediaBoardNetId?: string;
  openMediaBoardYN: boolean;
  openPlatformYN: boolean;
  onlyPresenterModeYN: boolean;
}

interface SpacePostReqBody {
  typeId: string;
  name: string;
  password?: string;
  privateYN: boolean;
  lobbyYN: boolean;
}

interface SpacePostResBody {
  space?: SpaceRes;
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces:
 *    post:
 *      tags: [Space]
 *      description: 공간 생성
 *      requestBody:
 *        description: 공간 생성 정보
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: "object"
 *              properties:
 *                typeId:
 *                  type: "string"
 *                  required: true
 *                name:
 *                  type: "string"
 *                  required: true
 *                lobbyYN:
 *                  type: "boolean"
 *                  required: true
 *                privateYN:
 *                  type: "boolean"
 *                  required: true
 *                password:
 *                  type: "string"
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  space:
 *                    $ref: '#/definitions/Space'
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
  '/',
  async (req: Request<unknown, SpacePostResBody, SpacePostReqBody>, res: Response<SpacePostResBody, unknown>) => {
    try {
      const { typeId, name, lobbyYN, privateYN, password } = req.body;
      const error: { type: ErrorType; target: string; message?: string }[] = [];
      if (!typeId) {
        error.push({
          type: 'INPUT_NOT_EXIST',
          target: 'typeId',
        });
      } else if (typeof typeId !== 'string') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'typeId',
        });
      } else if (!mongoose.Types.ObjectId.isValid(typeId)) {
        error.push({
          type: 'INVALID_INPUT',
          target: 'typeId',
        });
      } else if (!(await SpaceType.findById(typeId))) {
        error.push({
          type: 'INVALID_INPUT',
          target: 'typeId',
          message: 'Space type is not exist',
        });
      }
      if (!name) {
        error.push({
          type: 'INPUT_NOT_EXIST',
          target: 'name',
        });
      } else if (typeof name !== 'string') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'name',
        });
      } else if (await Space.findOne({ name })) {
        error.push({
          type: 'INVALID_INPUT',
          target: 'name',
          message: 'Name is already exist',
        });
      } else if (await User.findOne({ username: name })){
        error.push({
          type: 'INVALID_INPUT',
          target: 'name',
          message: 'Name is reserved'
        });
      }
      if (lobbyYN === undefined) {
        error.push({
          type: 'INPUT_NOT_EXIST',
          target: 'lobbyYN',
        });
      } else if (typeof lobbyYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'lobbyYN',
        });
      }
      if (privateYN === undefined) {
        error.push({
          type: 'INPUT_NOT_EXIST',
          target: 'privateYN',
        });
      } else if (typeof privateYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'privateYN',
        });
      }
      if (privateYN) {
        if (!password) {
          error.push({
            type: 'INPUT_NOT_EXIST',
            target: 'password',
          });
        } else if (typeof password !== 'string') {
          error.push({
            type: 'INVALID_INPUT',
            target: 'password',
          });
        }
      }
      if (error.length > 0) {
        res.status(400).json({
          error,
        });
        return;
      }
      const space = await Space.create({
        name,
        typeId,
        lobbyYN,
        privateYN,
        password,
        ownerId: req.ctx.userId,
      });

      res.status(200).json({
        space: {
          id: space._id.toHexString(),
          name: space.name,
          typeId: space.typeId.toHexString(),
          isPersonal: space.isPersonal,
          privateYN: space.privateYN,
          lobbyYN: space.lobbyYN,
          ownerId: space.ownerId.toHexString(),
          notice: space.notice,
          inviteLink: space.inviteLink,
          mediaBoardNetId: space.mediaBoardNetId,
          openMediaBoardYN: space.openMediaBoardYN,
          openPlatformYN: space.openPlatformYN,
          onlyPresenterModeYN: space.onlyPresenterModeYN,
        },
      });
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface SpacesGetResBody {
  spaces?: SpaceRes[];
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces:
 *    get:
 *      tags: [Space]
 *      description: 공간 리스트 조회
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  spaces:
 *                    type: "array"
 *                    items:
 *                      $ref: '#/definitions/Space'
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
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
router.get('/', async (_req: Request<unknown, SpacesGetResBody, unknown>, res: Response<SpacesGetResBody, unknown>) => {
  try {
    const spaces = await Space.find({ isPersonal: false, useYN: true });
    res.status(200).json({
      spaces: spaces.map((space) => ({
        id: space._id.toHexString(),
        typeId: space.typeId.toHexString(),
        name: space.name,
        notice: space.notice,
        isPersonal: space.isPersonal,
        privateYN: space.privateYN,
        lobbyYN: space.lobbyYN,
        ownerId: space.ownerId.toHexString(),
        inviteLink: space.inviteLink,
        mediaBoardNetId: space.mediaBoardNetId,
        openMediaBoardYN: space.openMediaBoardYN,
        openPlatformYN: space.openPlatformYN,
        onlyPresenterModeYN: space.onlyPresenterModeYN,
      })),
    });
  } catch (e) {
    res.status(500).json({
      error: [
        {
          type: 'SERVER_ERROR',
          target: 'internal',
        },
      ],
    });
  }
  return;
});

interface SpaceGetResBody {
  space?: SpaceRes;
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{id}:
 *    get:
 *      tags: [Space]
 *      description: 단일 공간 정보 조회
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  space:
 *                    $ref: '#/definitions/Space'
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
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
router.get('/:id', async (req: Request<unknown, SpaceGetResBody, unknown>, res: Response<SpaceGetResBody, unknown>) => {
  try {
    const spaceId = (req.params as { id: string }).id;
    const space = await Space.findById(spaceId);
    if (!space || !space.useYN) {
      res.status(400).json({
        error: [
          {
            type: 'INVALID_INPUT',
            target: 'param.id',
            message: 'Space is not exist',
          },
        ],
      });
      return;
    }
    res.status(200).json({
      space: {
        id: space._id.toHexString(),
        typeId: space.typeId.toHexString(),
        name: space.name,
        notice: space.notice,
        isPersonal: space.isPersonal,
        privateYN: space.privateYN,
        lobbyYN: space.lobbyYN,
        ownerId: space.ownerId.toHexString(),
        inviteLink: space.inviteLink,
        mediaBoardNetId: space.mediaBoardNetId,
        openMediaBoardYN: space.openMediaBoardYN,
        openPlatformYN: space.openPlatformYN,
        onlyPresenterModeYN: space.onlyPresenterModeYN,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: [
        {
          type: 'SERVER_ERROR',
          target: 'internal',
        },
      ],
    });
  }
  return;
});
/**
 * @swagger
 *  /spaces/name/{name}:
 *    get:
 *      tags: [Space]
 *      description: 단일 공간 정보 조회
 *      parameters:
 *        - in: path
 *          name: name
 *          description: space name
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  space:
 *                    $ref: '#/definitions/Space'
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
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
 router.get('/name/:name', async (req: Request<unknown, SpaceGetResBody, unknown>, res: Response<SpaceGetResBody, unknown>) => {
  try {
    const spaceName = (req.params as { name: string }).name;
    const space = await Space.findOne({ name: spaceName });
    if (!space || !space.useYN) {
      res.status(400).json({
        error: [
          {
            type: 'INVALID_INPUT',
            target: 'param.name',
            message: 'Space is not exist',
          },
        ],
      });
      return;
    }
    res.status(200).json({
      space: {
        id: space._id.toHexString(),
        typeId: space.typeId.toHexString(),
        name: space.name,
        notice: space.notice,
        isPersonal: space.isPersonal,
        privateYN: space.privateYN,
        lobbyYN: space.lobbyYN,
        ownerId: space.ownerId.toHexString(),
        inviteLink: space.inviteLink,
        mediaBoardNetId: space.mediaBoardNetId,
        openMediaBoardYN: space.openMediaBoardYN,
        openPlatformYN: space.openPlatformYN,
        onlyPresenterModeYN: space.onlyPresenterModeYN,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: [
        {
          type: 'SERVER_ERROR',
          target: 'internal',
        },
      ],
    });
  }
  return;
});

interface SpacePatchReqBody {
  notice?: string;
  password?: string;
  privateYN?: boolean;
  lobbyYN?: boolean;
  mediaBoardNetId?: string;
  openMediaBoardYN?: boolean;
  openPlatformYN?: boolean;
  onlyPresenterModeYN?: boolean;
}

interface SpacePatchResBody {
  space?: SpaceRes;
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{id}:
 *    patch:
 *      tags: [Space]
 *      description: 공간 정보 변경
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      requestBody:
 *        description: 공간 Update 정보
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: "object"
 *              properties:
 *                notice:
 *                  type: "string"
 *                lobbyYN:
 *                  type: "boolean"
 *                privateYN:
 *                  type: "boolean"
 *                password:
 *                  type: "string"
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  space:
 *                    $ref: '#/definitions/Space'
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
 *        403:
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
 *                          value: "FORBIDDEN"
 *                        target:
 *                          type: "string"
 *                          value: "param.id"
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
router.patch(
  '/:id',
  async (req: Request<unknown, SpacePatchResBody, SpacePatchReqBody>, res: Response<SpacePatchResBody, unknown>) => {
    try {
      const userId = req.ctx.userId;
      const spaceId = (req.params as { id: string }).id;
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.id',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }
      if (space.ownerId.toHexString() !== userId) {
        res.status(403).json({
          error: [
            {
              type: 'FORBIDDEN',
              target: 'param.id',
              message: 'Only the owner can modify info',
            },
          ],
        });
        return;
      }
      const { notice, password, privateYN, lobbyYN, mediaBoardNetId, openMediaBoardYN, openPlatformYN, onlyPresenterModeYN } = req.body;
      if (
        !notice &&
        privateYN === undefined &&
        lobbyYN === undefined &&
        !mediaBoardNetId &&
        openMediaBoardYN === undefined &&
        openPlatformYN === undefined &&
        onlyPresenterModeYN === undefined
      ) {
        res.status(400).json({
          error: [
            {
              type: 'INPUT_NOT_EXIST',
              target: 'reqBody',
            },
          ],
        });
        return;
      }
      const error: { type: ErrorType; target: string; message?: string }[] = [];
      if (notice && typeof notice !== 'string') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'notice',
        });
      }
      if (lobbyYN !== undefined && typeof lobbyYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'lobbyYN',
        });
      }
      if (privateYN !== undefined && typeof privateYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'privateYN',
        });
      }
      if (privateYN) {
        if (!password) {
          error.push({
            type: 'INVALID_INPUT',
            target: 'password',
            message: 'Password is not exist',
          });
        }
        if (typeof password !== 'string') {
          error.push({
            type: 'INVALID_INPUT',
            target: 'password',
          });
        }
      }
      if (mediaBoardNetId && typeof mediaBoardNetId !== 'string') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'mediaBoardNetId',
        });
      }
      if (openMediaBoardYN !== undefined && typeof openMediaBoardYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'openMediaBoardYN',
        });
      }
      if (openPlatformYN !== undefined && typeof openPlatformYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'openPlatformYN',
        });
      }
      if (onlyPresenterModeYN !== undefined && typeof onlyPresenterModeYN !== 'boolean') {
        error.push({
          type: 'INVALID_INPUT',
          target: 'onlyPresenterModeYN',
        });
      }
      if (error.length > 0) {
        res.status(400).json({
          error,
        });
        return;
      }
      await Space.updateOne(
        {
          _id: spaceId,
        },
        {
          notice,
          password,
          privateYN,
          lobbyYN,
          mediaBoardNetId,
          openMediaBoardYN,
          openPlatformYN,
          onlyPresenterModeYN,
        },
      );
      const updatedSpace = await Space.findById(spaceId);
      res.status(200).json({
        space: {
          id: updatedSpace._id.toHexString(),
          typeId: updatedSpace.typeId.toHexString(),
          name: updatedSpace.name,
          notice: updatedSpace.notice,
          isPersonal: space.isPersonal,
          privateYN: updatedSpace.privateYN,
          lobbyYN: updatedSpace.lobbyYN,
          ownerId: updatedSpace.ownerId.toHexString(),
          inviteLink: updatedSpace.inviteLink,
          mediaBoardNetId: updatedSpace.mediaBoardNetId,
          openMediaBoardYN: updatedSpace.openMediaBoardYN,
          openPlatformYN: updatedSpace.openPlatformYN,
          onlyPresenterModeYN: updatedSpace.onlyPresenterModeYN,
        },
      });
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface SpaceDeleteResBody {
  space?: SpaceRes;
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{id}:
 *    delete:
 *      tags: [Space]
 *      description: 공간 생성
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            null
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
 *        403:
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
 *                          value: "FORBIDDEN"
 *                        target:
 *                          type: "string"
 *                          value: "param.id"
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
router.delete(
  '/:id',
  async (req: Request<unknown, SpaceDeleteResBody, unknown>, res: Response<SpaceDeleteResBody, unknown>) => {
    try {
      const userId = req.ctx.userId;
      const spaceId = (req.params as { id: string }).id;
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.id',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }
      if (space.ownerId.toHexString() !== userId) {
        res.status(403).json({
          error: [
            {
              type: 'FORBIDDEN',
              target: 'param.id',
              message: 'Only the owner can modify info',
            },
          ],
        });
        return;
      }
      if (space.isPersonal) {
        res.status(403).json({
          error: [
            {
              type: 'FORBIDDEN',
              target: 'param.id',
              message: 'Personal space cannot be deleted',
            },
          ],
        });
        return;
      }
      await Space.updateOne({ _id: spaceId }, { useYN: false });
      res.status(200).send();
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface ParticipateReqBody {
  password?: string;
}

interface ParticipateResBody {
  candId?: string;
  status?: 'REJECTED' | 'ACCEPTED' | 'WAITING' | 'CANCELED';
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{id}/participate:
 *    post:
 *      tags: [Space]
 *      description: 공간 참여 요청
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      requestBody:
 *        description: ReqBody
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: "object"
 *              properties:
 *                password:
 *                  type: "string"
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  status:
 *                    type: string
 *                    enum: ["REJECTED", "ACCEPTED", "WAITING"]
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
  '/:id/participate',
  async (req: Request<unknown, ParticipateResBody, ParticipateReqBody>, res: Response<ParticipateResBody, unknown>) => {
    try {
      const userId = req.ctx.userId;
      const spaceId = (req.params as { id: string }).id;
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.id',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }

      // * owner인경우 상관없이 승인
      if (userId === space.ownerId.toHexString()) {
        const p = await Participate.create({
          userId,
          spaceId,
          status: 'ACCEPTED',
        });
        res.status(200).send({
          candId: p._id.toHexString(),
          status: 'ACCEPTED',
        });
        return;
      }
      const { password } = req.body;
      // * lobby가 있는 경우, password가 없는 경우에는 모두 waiting
      if (space.lobbyYN) {
        if (password && space.privateYN && space.password === password) {
          const p = await Participate.create({
            userId,
            spaceId,
            status: 'ACCEPTED',
          });
          res.status(200).send({
            candId: p._id.toHexString(),
            status: 'ACCEPTED',
          });
          return;
        }
        await Participate.deleteMany({
          userId,
          spaceId,
        });
        const p = await Participate.create({
          userId,
          spaceId,
          status: 'WAITING',
        });
        res.status(200).send({
          candId: p._id.toHexString(),
          status: 'WAITING',
        });
        return;
      }
      // * lobby가 없는 경우 private 여부와 비밀번호 확인이 필요
      else {
        // * private가 아니면 바로 통과
        if (!space.privateYN) {
          const p = await Participate.create({
            userId,
            spaceId,
            status: 'ACCEPTED',
          });
          res.status(200).send({
            candId: p._id.toHexString(),
            status: 'ACCEPTED',
          });
          return;
        }
        // * private면 password 확인
        else {
          if (space.password === password) {
            const p = await Participate.create({
              userId,
              spaceId,
              status: 'ACCEPTED',
            });
            res.status(200).send({
              candId: p._id.toHexString(),
              status: 'ACCEPTED',
            });
            return;
          } else {
            res.status(400).json({
              error: [
                {
                  type: 'INVALID_INPUT',
                  target: 'password',
                  message: 'Password is wrong',
                },
              ],
            });
            return;
          }
        }
      }
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface ParticipantsResBody {
  participants?: {
    participantId: string;
    user: UserRes;
  }[];
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{id}/participants:
 *    get:
 *      tags: [Space]
 *      description: 공간 참여자 리스트 조회
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  candidates:
 *                    type: "array"
 *                    items:
 *                      type: object
 *                      properties:
 *                        participantId:
 *                          type: string
 *                          required: true
 *                        user:
 *                          $ref: '#/definitions/User'
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
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
router.get(
  '/:id/participants',
  async (req: Request<unknown, ParticipantsResBody, unknown>, res: Response<ParticipantsResBody, unknown>) => {
    try {
      const spaceId = (req.params as { id: string }).id;
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.id',
              message: 'Space is not exist',
            },
          ],
        });
      }
      const participants = await Participate.find({ spaceId, status: 'ACCEPTED' }).populate('userId');
      res.status(200).json({
        participants: participants.map((p) => {
          const user = p.userId as unknown as {
            _id: string;
            name: string;
            language: 'ko' | 'en';
            avatarSrc: string;
            vmeetingId: string;
            speechBubbleYN: boolean;
          };
          return {
            participantId: p._id.toHexString(),
            user: {
              id: user._id,
              name: user.name,
              language: user.language,
              avatarSrc: user.avatarSrc,
              vmeetingId: user.vmeetingId,
              speechBubbleYN: user.speechBubbleYN,
            },
          };
        }),
      });
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface CandidatesResBody {
  candidates?: {
    participantId: string;
    status: string;
    user: UserRes;
  }[];
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{id}/candidates:
 *    get:
 *      tags: [Space]
 *      description: 공간 대기자 리스트 조회
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: "object"
 *                properties:
 *                  candidates:
 *                    type: "array"
 *                    items:
 *                      type: object
 *                      properties:
 *                        participantId:
 *                          type: string
 *                          required: true
 *                        user:
 *                          $ref: '#/definitions/User'
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
 *        403:
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
 *                          value: "FORBIDDEN"
 *                        target:
 *                          type: "string"
 *                          value: "param.id"
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
router.get(
  '/:id/candidates',
  async (req: Request<unknown, CandidatesResBody, unknown>, res: Response<CandidatesResBody, unknown>) => {
    try {
      const userId = req.ctx.userId;
      const spaceId = (req.params as { id: string }).id;
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.id',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }
      const candidates = await Participate.find({ $or: [{status: 'WAITING'}, {status: 'CANCELED'}], $and: [{ spaceId: spaceId }]}).populate('userId');  
      //const candidates = await Participate.find({ spaceId, status: 'WAITING' }).populate('userId');
      res.status(200).json({
        candidates: candidates.map((c) => {
          const user = c.userId as unknown as {
            _id: string;
            name: string;
            language: 'ko' | 'en';
            avatarSrc: string;
            vmeetingId: string;
            speechBubbleYN: boolean;
          };
          return {
            participantId: c._id.toHexString(),
            status: c.status,
            user: {
              id: user._id,
              name: user.name,
              language: user.language,
              avatarSrc: user.avatarSrc,
              vmeetingId: user.vmeetingId,
              speechBubbleYN: user.speechBubbleYN,
            },
          };
        }),
      });
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface SpaceCandidateAcceptResBody {
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{spaceId}/candidates/{candId}/accept:
 *    post:
 *      tags: [Space]
 *      description: 공간 대기자 참여 수락
 *      parameters:
 *        - in: path
 *          name: id
 *          description: spaceId
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            null
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
 *        403:
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
 *                          value: "FORBIDDEN"
 *                        target:
 *                          type: "string"
 *                          value: "param.id"
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
  '/:spaceId/candidates/:candId/accept',
  async (
    req: Request<unknown, SpaceCandidateAcceptResBody, unknown>,
    res: Response<SpaceCandidateAcceptResBody, unknown>,
  ) => {
    try {
      const userId = req.ctx.userId;
      const { spaceId, candId } = req.params as { spaceId: string; candId: string };
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.spaceId',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }
      const participate = await Participate.findById(candId);
      if (!participate) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.candId',
              message: 'Candidate is not exist',
            },
          ],
        });
        return;
      }
      if (space.ownerId._id.toHexString() !== userId) {
        res.status(403).json({
          error: [
            {
              type: 'FORBIDDEN',
              target: 'param.spaceId',
              message: 'Only owner can accept',
            },
          ],
        });
        return;
      }
      await Participate.updateOne({ _id: candId }, { status: 'ACCEPTED' });
      res.status(200).send();
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface SpaceCandidateRejectResBody {
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

/**
 * @swagger
 *  /spaces/{spaceId}/candidates/{candId}/reject:
 *    post:
 *      tags: [Space]
 *      description: 공간 대기자 참여 거절
 *      parameters:
 *        - in: path
 *          name: spaceId
 *          description: spaceId
 *          schema:
 *            - type: string
 *        - in: path
 *          name: candId
 *          description: candidate's id
 *          schema:
 *            - type: string
 *      produces:
 *        - "application/json"
 *      responses:
 *        200:
 *          content:
 *            null
 *        401:
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
 *                          value: "UNAUTHORIZED"
 *                        target:
 *                          type: "string"
 *                          value: "token"
 *                        message:
 *                          type: "string"
 *                          value: 'Please, check your header'
 *        403:
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
 *                          value: "FORBIDDEN"
 *                        target:
 *                          type: "string"
 *                          value: "param.id"
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
  '/:spaceId/candidates/:candId/reject',
  async (
    req: Request<unknown, SpaceCandidateRejectResBody, unknown>,
    res: Response<SpaceCandidateRejectResBody, unknown>,
  ) => {
    try {
      const userId = req.ctx.userId;
      const { spaceId, candId } = req.params as { spaceId: string; candId: string };
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.spaceId',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }
      const participate = await Participate.findById(candId);
      if (!participate) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.candId',
              message: 'Candidate is not exist',
            },
          ],
        });
        return;
      }
      if (space.ownerId._id.toHexString() !== userId) {
        res.status(403).json({
          error: [
            {
              type: 'FORBIDDEN',
              target: 'param.spaceId',
              message: 'Only owner can accept',
            },
          ],
        });
        return;
      }
      await Participate.updateOne({ _id: candId }, { status: 'REJECTED' });
      res.status(200).send();
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);

interface SpaceCandidateCancelResBody {
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

router.post(
  '/:spaceId/candidates/:candId/cancel',
  async (
    req: Request<unknown, SpaceCandidateCancelResBody, unknown>,
    res: Response<SpaceCandidateCancelResBody, unknown>,
  ) => {
    try {
      const userId = req.ctx.userId;
      const { spaceId, candId } = req.params as { spaceId: string; candId: string };
      const space = await Space.findById(spaceId);
      if (!space || !space.useYN) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.spaceId',
              message: 'Space is not exist',
            },
          ],
        });
        return;
      }
      const participate = await Participate.findById(candId);
      if (!participate) {
        res.status(400).json({
          error: [
            {
              type: 'INVALID_INPUT',
              target: 'param.candId',
              message: 'Candidate is not exist',
            },
          ],
        });
        return;
      }
      await Participate.updateOne({ _id: candId }, { status: 'CANCELED' });
      res.status(200).send();
    } catch (e) {
      res.status(500).json({
        error: [
          {
            type: 'SERVER_ERROR',
            target: 'internal',
          },
        ],
      });
    }
    return;
  },
);


interface SpacePasswordRes {
  id: string;
  password: string;
}

interface SpacePasswordGetResBody {
  space?: SpacePasswordRes;
  error?: {
    type: ErrorType;
    target: string;
    message?: string;
  }[];
}

router.get('/:id/password', async (req: Request<unknown, SpacePasswordGetResBody, unknown>, res: Response<SpacePasswordGetResBody, unknown>) => {
  try {
    const spaceId = (req.params as { id: string }).id;
    const space = await Space.findById(spaceId);
    if (!space || !space.useYN) {
      res.status(400).json({
        error: [
          {
            type: 'INVALID_INPUT',
            target: 'param.id',
            message: 'Space is not exist',
          },
        ],
      });
      return;
    }

    if (!space.privateYN) {
      res.status(400).json({
        error: [
          {
            type: 'INVALID_INPUT',
            target: 'param.privateYN',
            message: 'Not a private space',
          },
        ],
      });
      return;
    }

    res.status(200).json({
      space: {
        id: space._id.toHexString(),
        password: space.password,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: [
        {
          type: 'SERVER_ERROR',
          target: 'internal',
        },
      ],
    });
  }
  return;
});

export default router;
