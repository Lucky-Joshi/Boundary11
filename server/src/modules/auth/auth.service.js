import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/token.js';

function issue(account) {
  const token = signToken({ sub: account.id, role: account.role });
  return {
    token,
    user: { id: account.id, email: account.email, fullName: account.fullName, role: account.role },
  };
}

export function login({ email, password }) {
  const provider = getProvider();
  const result = provider.authenticate(email, password);
  if (!result) throw ApiError.unauthorized('Incorrect email or password.');
  if (result.disabled) throw ApiError.forbidden('This account has been disabled.');
  return issue(result.account);
}

export function register(input) {
  const account = getProvider().register(input);
  return issue(account);
}

export function me(req) {
  const account = getProvider().getAccountById(req.user.id);
  if (!account) throw ApiError.notFound('Account not found.');
  return { id: account.id, email: account.email, fullName: account.fullName, role: account.role, createdAt: account.createdAt };
}
