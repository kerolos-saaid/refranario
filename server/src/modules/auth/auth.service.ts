import type { TokenService } from '../../shared/security/jwt.service'
import type { UserRepository } from './user.repository'

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepository.findByCredentials(username, password)

    if (!user) {
      return null
    }

    const token = await this.tokenService.sign({ username: user.username, role: user.role })

    return {
      success: true as const,
      username: user.username,
      role: user.role,
      token
    }
  }
}
