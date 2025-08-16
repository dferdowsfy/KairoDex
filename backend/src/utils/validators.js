const { z } = require('zod');

const email = z.string().email();
const password = z.string().min(8).max(128);

const registerSchema = z.object({
  email,
  password,
  role: z.enum(['ADMIN', 'USER']).optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
});

const projectUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const data = ['GET', 'DELETE'].includes(req.method) ? req.query : req.body;
    const result = schema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: result.error.flatten() } });
    }
    req.validated = result.data;
    return next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  projectCreateSchema,
  projectUpdateSchema,
  validate,
};
