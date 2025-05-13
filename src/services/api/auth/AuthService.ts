import BaseApiService from '../BaseApiService'

class AuthService extends BaseApiService {
  constructor() {
    super('auth') // a rota base será /api/auth
  }

  login(credentials) {
    return this.post('login', credentials)
  }

  logout() {
    return this.post('logout')
  }

  me() {
    return this.get('me')
  }
}
const authService = new AuthService()
export { authService }
