import bcrypt from "bcryptjs";

export class AdminAuthService {
  private readonly pinHash: string;

  constructor(pin: string, pinHash?: string) {
    this.pinHash = pinHash && pinHash.length > 0 ? pinHash : bcrypt.hashSync(pin, 10);
  }

  async verifyPin(pin: string): Promise<boolean> {
    return bcrypt.compare(pin, this.pinHash);
  }
}
