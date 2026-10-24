import type { FastifyPluginAsync } from 'fastify';
import { ObjectId } from 'mongodb';
import { requireAuth } from '../auth.js';
import { todos } from '../db.js';

interface IdParams {
  id: string;
}

interface CreateBody {
  title: string;
}

interface UpdateBody {
  title?: string;
  completed?: boolean;
}

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
} as const;

export const todoRoutes: FastifyPluginAsync = async (app) => {
  // every route in this plugin requires login
  app.addHook('preHandler', requireAuth);

  const currentUserId = (userId: string | undefined) => new ObjectId(userId);

  // CREATE
  app.post<{ Body: CreateBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: { title: { type: 'string', minLength: 1, maxLength: 200 } },
        },
      },
    },
    async (request, reply) => {
      const now = new Date();
      const todo = {
        userId: currentUserId(request.session.userId),
        title: request.body.title,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      const { insertedId } = await todos().insertOne(todo);
      return reply.code(201).send({ _id: insertedId, ...todo });
    },
  );

  // READ all
  app.get('/', async (request) => {
    return todos()
      .find({ userId: currentUserId(request.session.userId) })
      .sort({ createdAt: -1 })
      .toArray();
  });

  // READ one
  app.get<{ Params: IdParams }>('/:id', { schema: { params: idParams } }, async (request, reply) => {
    const todo = await todos().findOne({
      _id: new ObjectId(request.params.id),
      userId: currentUserId(request.session.userId),
    });
    return todo ?? reply.code(404).send({ error: 'Todo not found' });
  });

  // UPDATE
  app.patch<{ Params: IdParams; Body: UpdateBody }>(
    '/:id',
    {
      schema: {
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            completed: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const todo = await todos().findOneAndUpdate(
        { _id: new ObjectId(request.params.id), userId: currentUserId(request.session.userId) },
        { $set: { ...request.body, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      return todo ?? reply.code(404).send({ error: 'Todo not found' });
    },
  );

  // DELETE
  app.delete<{ Params: IdParams }>('/:id', { schema: { params: idParams } }, async (request, reply) => {
    const { deletedCount } = await todos().deleteOne({
      _id: new ObjectId(request.params.id),
      userId: currentUserId(request.session.userId),
    });
    return deletedCount ? reply.code(204).send() : reply.code(404).send({ error: 'Todo not found' });
  });
};
