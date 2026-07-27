import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import { z } from 'zod';
import { Usuario as UsuarioModel, Rol, LoginAudit, RefreshToken } from '../models';
import { environment } from '../../config/environment';
import { AppError } from '../shared/errors';
import { wrapAsync } from '../shared/utils/wrapAsync';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000;
const AUTH_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const COOKIE_BASE = {
  httpOnly: true,
  secure: environment.nodeEnv === 'production',
  sameSite: environment.nodeEnv === 'production' ? 'none' as const : 'lax' as const,
  path: '/',
};

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const forgotSchema = z.object({
  correo: z.string().email('Correo inválido'),
});

const resetSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

async function checkLoginLockDB(username: string): Promise<number | null> {
  const usuario = await UsuarioModel.findOne({
    where: { username },
    attributes: ['id_usuario', 'locked_until'],
  });
  if (!usuario || !usuario.locked_until) return null;
  if (usuario.locked_until <= new Date()) {
    await UsuarioModel.update(
      { failed_attempts: 0, locked_until: null },
      { where: { id_usuario: usuario.id_usuario } }
    );
    return null;
  }
  const remaining = Math.ceil((usuario.locked_until.getTime() - Date.now()) / 60000);
  return remaining;
}

async function recordFailedAttemptDB(username: string, ip: string, userAgent: string) {
  const usuario = await UsuarioModel.findOne({
    where: { username },
    attributes: ['id_usuario', 'username', 'failed_attempts'],
  });

  const realUsername = usuario ? usuario.username : username;

  await LoginAudit.create({
    username: realUsername,
    ip_address: ip,
    user_agent: userAgent,
    success: false,
  });

  if (usuario) {
    await UsuarioModel.increment('failed_attempts', { where: { id_usuario: usuario.id_usuario } });
    if (usuario.failed_attempts + 1 >= MAX_ATTEMPTS) {
      await UsuarioModel.update(
        { locked_until: new Date(Date.now() + LOCK_DURATION) },
        { where: { id_usuario: usuario.id_usuario } }
      );
    }
  }
}

async function clearLoginAttemptsDB(username: string, ip: string, userAgent: string) {
  const usuario = await UsuarioModel.findOne({
    where: { username },
    attributes: ['id_usuario', 'username']
  });

  const realUsername = usuario ? usuario.username : username;

  if (usuario) {
    await UsuarioModel.update(
      { failed_attempts: 0, locked_until: null },
      { where: { id_usuario: usuario.id_usuario } }
    );
  }

  await LoginAudit.create({
    username: realUsername,
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

async function getTokenVersion(idUsuario: number): Promise<number> {
  const u = await UsuarioModel.findByPk(idUsuario, { attributes: ['token_version'] });
  return (u?.getDataValue('token_version') as number) || 0;
}

async function setAuthCookies(res: Response, usuario: any) {
  const tokenVersion = await getTokenVersion(usuario.id_usuario);
  const payload = {
    idUsuario: usuario.id_usuario,
    username: usuario.username,
    idRol: usuario.id_rol,
    rol: usuario.rol ? (usuario.rol as any).nombre : null,
    tokenVersion,
  };

  const accessToken = jwt.sign(payload, environment.jwtSecret, { expiresIn: '15m' });
  const refreshTokenValue = crypto.randomUUID();
  const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

  await RefreshToken.create({
    id_usuario: usuario.id_usuario,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
  });

  res.cookie(AUTH_COOKIE, accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshTokenValue, {
    ...COOKIE_BASE,
    maxAge: 8 * 60 * 60 * 1000,
  });

  return accessToken;
}

function clearAuthCookies(res: Response) {
  res.clearCookie(AUTH_COOKIE, COOKIE_BASE);
  res.clearCookie(REFRESH_COOKIE, COOKIE_BASE);
}

async function sendPasswordChangeNotification(usuario: any, action: string) {
  const correoDestino = usuario.correo || null;
  if (!correoDestino) return;

  try {
    await transporter.sendMail({
      from: `"Soporte Liceo" <${environment.smtp.from}>`,
      to: correoDestino,
      subject: `Contraseña ${action} - Liceo Estilita Orozco`,
      text: `Hola ${usuario.username}, te notificamos que tu contraseña ha sido ${action}. Si no realizaste esta acción, comunícate con el administrador de inmediato.`,
      html: `
        <div style="background-color: #f8fafc; padding: 20px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <tr>
              <td style="background-color: #1a237e; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Liceo Estilita Orozco</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px; line-height: 1.6; color: #334155;">
                <h2 style="color: #1a237e; margin-top: 0; font-size: 20px;">Notificación de seguridad</h2>
                <p style="font-size: 16px;">Hola <strong>${usuario.username}</strong>,</p>
                <p style="font-size: 16px;">Tu contraseña ha sido <strong>${action}</strong> exitosamente.</p>
                <div style="margin: 30px 0; padding: 20px; background-color: #f1f5f9; border-radius: 8px; border-left: 4px solid #1a237e;">
                  <p style="margin: 0; font-size: 14px; color: #475569;">
                    Si no realizaste esta acción, comunícate con el administrador del sistema de inmediato.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  &copy; ${new Date().getFullYear()} Liceo Nacional Estilita Orozco.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log(`[Auth] Notificación de contraseña ${action} enviada a: ${correoDestino}`);
  } catch (error) {
    console.error(`[Auth] Error al enviar notificación de contraseña ${action}:`, error);
  }
}

const transporter = nodemailer.createTransport({
  host: environment.smtp.host,
  port: environment.smtp.port,
  secure: environment.smtp.port === 465,
  auth: {
    user: environment.smtp.user,
    pass: environment.smtp.pass,
  },
});

const SAFE_DELAY = 400;

export const AuthController = {
  obtenerCsrfToken: wrapAsync(async (_req: Request, res: Response) => {
    res.json({ ok: true, csrfToken: res.locals.csrfToken });
  }),

  login: wrapAsync(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('El usuario y la contraseña son requeridos', 400);
    }

    const { username, password } = parsed.data;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const usernameKey = username.toLowerCase();

    const lockRemaining = await checkLoginLockDB(usernameKey);
    if (lockRemaining !== null) {
      throw new AppError(`Demasiados intentos fallidos. Cuenta bloqueada por ${lockRemaining} minuto(s).`, 429);
    }

    const usuario = await UsuarioModel.findOne({
      where: { username: { [Op.iLike]: usernameKey } },
      include: [
        { model: Rol, as: 'rol' },
      ]
    });

    let passwordMatch = false;
    if (usuario && usuario.estatus === 'Activo') {
      passwordMatch = await bcrypt.compare(password, usuario.password_hash);
    }

    if (!usuario || !passwordMatch) {
      if (usuario) await recordFailedAttemptDB(usernameKey, ip, userAgent);
      await new Promise(resolve => setTimeout(resolve, SAFE_DELAY));
      const msg = usuario?.estatus !== 'Activo' && usuario
        ? 'Esta cuenta está inactiva o bloqueada. Comuníquese con el administrador.'
        : 'Usuario o contraseña incorrectos';
      throw new AppError(msg, usuario?.estatus !== 'Activo' && usuario ? 403 : 401);
    }

    await clearLoginAttemptsDB(usernameKey, ip, userAgent);

    let displayName = usuario.username;
    if (usuario.nombre1 && usuario.apellido1) {
      displayName = `${usuario.nombre1} ${usuario.apellido1}`;
    } else if (usuario.rol) {
      displayName = (usuario.rol as any).nombre;
    }

    const token = await setAuthCookies(res, usuario);

    usuario.ultimo_acceso = new Date();
    await usuario.save();

    res.json({
      ok: true,
      token,
      user: {
        userName: usuario.username,
        displayName,
        idRol: usuario.id_rol,
        rol: usuario.rol ? (usuario.rol as any).nombre : null,
      }
    });
  }),

  refresh: wrapAsync(async (req: Request, res: Response) => {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE];
    if (!refreshTokenValue) {
      throw new AppError('No autorizado', 401);
    }

    const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

    let storedToken;
    try {
      storedToken = await RefreshToken.findOne({
        where: { token_hash: tokenHash, revoked_at: null },
      });
    } catch (err: any) {
      if (err.name === 'SequelizeDatabaseError' || err.original?.code === 'ECONNRESET') {
        clearAuthCookies(res);
        throw new AppError('Sesión expirada, inicie sesión nuevamente', 401);
      }
      throw err;
    }

    if (!storedToken || storedToken.expires_at < new Date()) {
      clearAuthCookies(res);
      throw new AppError('No autorizado', 401);
    }

    await storedToken.update({ revoked_at: new Date() });

    const usuario = await UsuarioModel.findByPk(storedToken.id_usuario, {
      include: [{ model: Rol, as: 'rol' }],
    });
    if (!usuario || usuario.estatus !== 'Activo') {
      clearAuthCookies(res);
      throw new AppError('No autorizado', 401);
    }

    const newToken = await setAuthCookies(res, usuario);

    res.json({ ok: true, token: newToken });
  }),

  logout: wrapAsync(async (req: Request, res: Response) => {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE];
    if (refreshTokenValue) {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
      await RefreshToken.update(
        { revoked_at: new Date() },
        { where: { token_hash: tokenHash, revoked_at: null } }
      );
    }

    const tokenFromCookie = req.cookies?.[AUTH_COOKIE];
    if (tokenFromCookie) {
      try {
        const decoded = jwt.verify(tokenFromCookie, environment.jwtSecret, { algorithms: ['HS256'] }) as any;
        if (decoded.idUsuario) {
          await UsuarioModel.increment('token_version', { where: { id_usuario: decoded.idUsuario } });
        }
      } catch {}
    }

    clearAuthCookies(res);
    res.json({ ok: true, message: 'Sesión cerrada exitosamente' });
  }),

  solicitarRecuperacion: wrapAsync(async (req: Request, res: Response) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Correo electrónico inválido', 400);
    }

    const { correo } = parsed.data;

    const usuario = await UsuarioModel.findOne({
      where: { correo: correo.toLowerCase() }
    });

    if (!usuario) {
      console.log(`[Auth] Intento de recuperación fallido: correo ${correo} no encontrado en la DB.`);
      throw new AppError('El correo electrónico no se encuentra registrado en el sistema.', 404);
    }

    const correoDestino = usuario.correo;

    if (!correoDestino) {
      console.log(`[Auth] Usuario ${usuario.username} encontrado pero no tiene un correo válido definido.`);
      throw new AppError('El usuario encontrado no tiene un correo electrónico válido asociado para la recuperación.', 400);
    }

    const resetToken = jwt.sign(
      { idUsuario: usuario.id_usuario, purpose: 'password_reset' },
      environment.jwtSecret,
      { expiresIn: '1h' }
    );

    const resetLink = `${environment.frontendUrl.trim().replace(/\/$/, '')}/forgot-password?token=${resetToken}`;

    try {
      await transporter.sendMail({
        from: `"Soporte Liceo" <${environment.smtp.from}>`,
        to: correoDestino,
        subject: "Restablecer Contraseña - Liceo Estilita Orozco",
        text: `Hola ${usuario.username}, has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar (válido por 1 hora): ${resetLink}`,
        html: `
          <div style="background-color: #f8fafc; padding: 20px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
              <tr>
                <td style="background-color: #1a237e; padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">Liceo Estilita Orozco</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; line-height: 1.6; color: #334155;">
                  <h2 style="color: #1a237e; margin-top: 0; font-size: 20px;">Recuperación de acceso</h2>
                  <p style="font-size: 16px;">Hola <strong>${usuario.username}</strong>,</p>
                  <p style="font-size: 16px;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en nuestro sistema de gestión académica.</p>
                  <p style="font-size: 16px;">Haz clic en el siguiente botón para definir una nueva contraseña. Este enlace expirará en 1 hora.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #1a237e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                  </div>
                  <div style="margin: 30px 0; padding: 20px; background-color: #f1f5f9; border-radius: 8px; border-left: 4px solid #1a237e;">
                    <p style="margin: 0; font-size: 14px; color: #475569;">Si no has solicitado este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual no se verá afectada.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Liceo Nacional Estilita Orozco. Todos los derechos reservados.</p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">Departamento de Control de Estudios y Evaluación.</p>
                </td>
              </tr>
            </table>
          </div>
        `,
      });
      console.log(`[Auth] Correo de recuperación enviado exitosamente a: ${correoDestino}`);
    } catch (error) {
      console.error('[Auth] Error de Nodemailer/SMTP:', error);
      throw new AppError('Error al procesar el envío del correo electrónico.', 500);
    }

    res.json({ 
      ok: true, 
      message: 'Correo enviado con éxito.'
    });
  }),

  restablecerPassword: wrapAsync(async (req: Request, res: Response) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new AppError(first.message, 400);
    }

    const { token, password } = parsed.data;

    try {
      const decoded = jwt.verify(token, environment.jwtSecret) as any;

      if (decoded.purpose !== 'password_reset') {
        throw new AppError('Token inválido para esta operación', 400);
      }

      const usuario = await UsuarioModel.findByPk(decoded.idUsuario);
      if (!usuario) {
        throw new AppError('Usuario no encontrado', 404);
      }

      const salt = await bcrypt.genSalt(10);
      usuario.password_hash = await bcrypt.hash(password, salt);
      await usuario.save();

      sendPasswordChangeNotification(usuario, 'restablecida');

      res.json({ ok: true, message: 'Contraseña actualizada con éxito' });
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('El enlace ha expirado. Por favor, solicite uno nuevo.', 400);
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('El enlace de recuperación es inválido.', 400);
      }
      throw error;
    }
  }),

  obtenerPerfil: wrapAsync(async (req: AuthenticatedRequest, res: Response) => {
    const idUsuario = req.user?.idUsuario;
    if (!idUsuario) {
      throw new AppError('No autorizado', 401);
    }

    const usuario = await UsuarioModel.findByPk(idUsuario, {
      include: [
        { model: Rol, as: 'rol' },
      ]
    });

    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const rol = usuario.rol as any;

    res.json({
      data: {
        nombre1: usuario.nombre1 ?? null,
        nombre2: usuario.nombre2 ?? null,
        apellido1: usuario.apellido1 ?? null,
        apellido2: usuario.apellido2 ?? null,
        username: usuario.username,
        rol: rol?.nombre ?? null,
      }
    });
  }),

  cambiarPassword: wrapAsync(async (req: AuthenticatedRequest, res: Response) => {
    const idUsuario = req.user?.idUsuario;
    if (!idUsuario) {
      throw new AppError('No autorizado', 401);
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new AppError(first.message, 400);
    }

    const { currentPassword, newPassword } = parsed.data;

    const usuario = await UsuarioModel.findByPk(idUsuario);
    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const passwordMatch = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!passwordMatch) {
      throw new AppError('La contraseña actual es incorrecta', 401);
    }

    const salt = await bcrypt.genSalt(10);
    usuario.password_hash = await bcrypt.hash(newPassword, salt);
    await usuario.save();

    sendPasswordChangeNotification(usuario, 'cambiada');

    res.json({ data: { message: 'Contraseña actualizada con éxito' } });
  }),
};
