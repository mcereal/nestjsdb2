// src/pki/RSAKey.ts

import { randomBytes } from 'crypto';
import { BigInteger } from './BigInteger';

export class RSAKey {
  public n: BigInteger; // Modulus
  public e: BigInteger; // Public exponent
  public d?: BigInteger; // Private exponent

  constructor(n: BigInteger, e: BigInteger, d?: BigInteger) {
    this.n = n;
    this.e = e;
    if (d) {
      this.d = d;
    }
  }

  // Encrypt a message (BigInteger) using the public key
  encrypt(message: BigInteger): BigInteger {
    return message.modPow(this.e, this.n);
  }

  // Decrypt a message (BigInteger) using the private key
  decrypt(cipher: BigInteger): BigInteger {
    if (!this.d) {
      throw new Error('Private exponent is not set');
    }
    return cipher.modPow(this.d, this.n);
  }

  // Generate RSA Key Pair with specified bit length
  static generateKeyPair(bitLength: number): {
    publicKey: RSAKey;
    privateKey: RSAKey;
  } {
    // Typically, bitLength should be at least 1024 for security, but we'll use smaller for demonstration
    if (bitLength < 512) {
      throw new Error(
        'Bit length too small. Use at least 512 bits for demonstration.',
      );
    }

    // Step 1: Generate two distinct large prime numbers p and q
    const p = RSAKey.generateLargePrime(bitLength / 2);
    let q = RSAKey.generateLargePrime(bitLength / 2);
    while (q.compare(p) === 0) {
      q = RSAKey.generateLargePrime(bitLength / 2);
    }

    // Step 2: Compute n = p * q
    const n = p.multiply(q);

    // Step 3: Compute phi(n) = (p - 1) * (q - 1)
    const one = new BigInteger(1);
    const pMinus1 = p.subtract(one);
    const qMinus1 = q.subtract(one);
    const phi = pMinus1.multiply(qMinus1);

    // Step 4: Choose public exponent e
    // Common choice for e is 65537 (0x10001)
    const e = new BigInteger(65537);

    // Ensure that e and phi(n) are coprime
    if (!RSAKey.isCoprime(e, phi)) {
      throw new Error('Public exponent e is not coprime with phi(n)');
    }

    // Step 5: Compute private exponent d = e^{-1} mod phi(n)
    const d = e.modInverse(phi);

    const publicKey = new RSAKey(n, e);
    const privateKey = new RSAKey(n, e, d);

    return { publicKey, privateKey };
  }

  // Check if two BigIntegers are coprime
  private static isCoprime(a: BigInteger, b: BigInteger): boolean {
    const gcd = RSAKey.gcd(a, b);
    return gcd.toBigInt() === 1n;
  }

  // Compute GCD using Euclidean algorithm
  private static gcd(a: BigInteger, b: BigInteger): BigInteger {
    let x = a.toBigInt();
    let y = b.toBigInt();
    while (y !== 0n) {
      const temp = y;
      y = x % y;
      x = temp;
    }
    return BigInteger.fromBigInt(x);
  }

  // Generate a large prime number with the specified bit length
  private static generateLargePrime(bitLength: number): BigInteger {
    if (bitLength < 2) {
      throw new Error('Bit length must be at least 2');
    }

    while (true) {
      const candidate = RSAKey.randomPrimeCandidate(bitLength);
      const bigIntCandidate = BigInteger.fromBigInt(candidate);
      if (bigIntCandidate.isProbablePrime()) {
        return bigIntCandidate;
      }
    }
  }

  private static randomPrimeCandidate(bitLength: number): bigint {
    if (bitLength < 2) {
      throw new Error('Bit length must be at least 2');
    }

    const byteLength = Math.ceil(bitLength / 8);
    let candidate: bigint;

    do {
      const buffer = randomBytes(byteLength);
      candidate = BigInt('0x' + buffer.toString('hex'));

      // Ensure the highest bit is set to get the desired bit length
      candidate |= 1n << BigInt(bitLength - 1);

      // Ensure candidate is odd
      candidate |= 1n;
    } while (RSAKey.getBitLength(candidate) !== bitLength);

    return candidate;
  }

  // Add this helper method inside the RSAKey class
  private static getBitLength(n: bigint): number {
    if (n === 0n) return 0;
    let bits = 0;
    let temp = n;
    while (temp > 0n) {
      temp >>= 1n;
      bits++;
    }
    return bits;
  }

  /**
   * Exports the public key in PEM format.
   * @returns The PEM-formatted public key.
   */
  public toPublicPEM(): string {
    const encodedModulus = this.encodeASN1Integer(this.n);
    const encodedExponent = this.encodeASN1Integer(this.e);
    const rsaPublicKeySequence = this.encodeASN1Sequence([
      encodedModulus,
      encodedExponent,
    ]);
    const base64Key = rsaPublicKeySequence.toString('base64');
    return this.formatPEM(base64Key, 'RSA PUBLIC KEY');
  }

  /**
   * Exports the private key in PEM format.
   * @returns The PEM-formatted private key.
   */
  public toPrivatePEM(): string {
    if (!this.d) {
      throw new Error('Private exponent is not set');
    }

    const encodedModulus = this.encodeASN1Integer(this.n);
    const encodedPublicExponent = this.encodeASN1Integer(this.e);
    const encodedPrivateExponent = this.encodeASN1Integer(this.d);
    // Optionally, encode other values like p, q, etc., for a complete private key

    // Simplified: Only modulus, public exponent, and private exponent
    const rsaPrivateKeySequence = this.encodeASN1Sequence([
      encodedModulus,
      encodedPublicExponent,
      encodedPrivateExponent,
    ]);
    const base64Key = rsaPrivateKeySequence.toString('base64');
    return this.formatPEM(base64Key, 'RSA PRIVATE KEY');
  }
  // In RSAKey class

  /**
   * Encodes a BigInteger as an ASN.1 DER INTEGER.
   * @param bigint The BigInteger to encode.
   * @returns The ASN.1 DER encoded INTEGER.
   */
  public encodeASN1Integer(bigint: BigInteger): Buffer {
    let hex = bigint.toHex();

    // Remove leading zeros
    hex = hex.replace(/^0+/, '');

    // If the first byte >= 0x80, prepend a 0x00 to indicate positive integer
    if (parseInt(hex.slice(0, 2), 16) >= 0x80) {
      hex = '00' + hex;
    }

    const integerBuffer = Buffer.from(hex, 'hex');
    const lengthBuffer = this.encodeASN1Length(integerBuffer.length);
    return Buffer.concat([Buffer.from([0x02]), lengthBuffer, integerBuffer]);
  }

  /**
   * Encodes a sequence of ASN.1 DER elements.
   * @param elements An array of ASN.1 DER encoded buffers.
   * @returns The ASN.1 DER encoded SEQUENCE.
   */
  public encodeASN1Sequence(elements: Buffer[]): Buffer {
    const totalLength = elements.reduce((sum, el) => sum + el.length, 0);
    const lengthBuffer = this.encodeASN1Length(totalLength);
    return Buffer.concat([Buffer.from([0x30]), lengthBuffer, ...elements]);
  }

  /**
   * Encodes the length for ASN.1 DER encoding.
   * @param length The length to encode.
   * @returns The ASN.1 DER encoded length.
   */
  public encodeASN1Length(length: number): Buffer {
    if (length < 0x80) {
      return Buffer.from([length]);
    } else {
      const lengthHex = length.toString(16);
      const lengthBytes =
        lengthHex.length % 2 !== 0 ? '0' + lengthHex : lengthHex;
      const buffer = Buffer.from(lengthBytes, 'hex');
      const lengthOfLength = buffer.length;
      return Buffer.concat([Buffer.from([0x80 | lengthOfLength]), buffer]);
    }
  }

  /**
   * Formats a base64-encoded key with PEM headers.
   * @param base64 The base64-encoded key.
   * @param type The type of the key (e.g., 'RSA PUBLIC KEY').
   * @returns The PEM-formatted key.
   */
  public formatPEM(base64: string, type: string): string {
    const lines = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----\n`;
  }
}
