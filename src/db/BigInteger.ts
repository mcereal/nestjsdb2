import { randomBytes } from 'crypto';

export class BigInteger {
  // Represent the number as an array of bytes (big-endian)
  private value: number[];

  constructor(value: string | number | number[]) {
    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        // Hexadecimal string
        this.value = BigInteger.hexToBytes(value.slice(2));
      } else {
        // Decimal string
        this.value = BigInteger.decimalToBytes(value);
      }
    } else if (typeof value === 'number') {
      this.value = BigInteger.numberToBytes(value);
    } else {
      this.value = value;
    }
  }

  // Convert hexadecimal string to byte array
  private static hexToBytes(hex: string): number[] {
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  // Convert decimal string to byte array
  private static decimalToBytes(dec: string): number[] {
    let num = BigInt(dec);
    const bytes: number[] = [];
    while (num > 0) {
      bytes.unshift(Number(num % 256n));
      num = num / 256n;
    }
    return bytes;
  }

  // Convert number to byte array
  private static numberToBytes(num: number): number[] {
    const bytes: number[] = [];
    while (num > 0) {
      bytes.unshift(num & 0xff);
      num = num >> 8;
    }
    return bytes.length > 0 ? bytes : [0];
  }

  // Add two BigIntegers
  add(other: BigInteger): BigInteger {
    const a = [...this.value].reverse();
    const b = [...other.value].reverse();
    const result: number[] = [];
    let carry = 0;
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i++) {
      const sum = (a[i] || 0) + (b[i] || 0) + carry;
      carry = sum > 0xff ? 1 : 0;
      result.push(sum & 0xff);
    }
    if (carry) {
      result.push(carry);
    }
    return new BigInteger(result.reverse());
  }

  // Subtract other from this BigInteger (this - other)
  subtract(other: BigInteger): BigInteger {
    if (this.compare(other) < 0) {
      throw new Error('Subtraction would result in a negative value');
    }
    const a = [...this.value].reverse();
    const b = [...other.value].reverse();
    const result: number[] = [];
    let borrow = 0;
    for (let i = 0; i < a.length; i++) {
      let diff = (a[i] || 0) - (b[i] || 0) - borrow;
      if (diff < 0) {
        diff += 256;
        borrow = 1;
      } else {
        borrow = 0;
      }
      result.push(diff);
    }
    // Remove leading zeros
    while (result.length > 1 && result[result.length - 1] === 0) {
      result.pop();
    }
    return new BigInteger(result.reverse());
  }

  // Multiply two BigIntegers (simple O(n^2) implementation)
  multiply(other: BigInteger): BigInteger {
    // Simple base case
    if (this.value.length === 0 || other.value.length === 0) {
      return new BigInteger(0);
    }

    // Implement Karatsuba Multiplication for larger numbers
    // and switch to grade-school multiplication for smaller numbers
    const n = Math.max(this.value.length, other.value.length);
    if (n < 32) {
      // Threshold can be adjusted
      return this.gradeSchoolMultiply(other);
    }

    const m = Math.floor(n / 2);

    const low1 = new BigInteger(this.value.slice(this.value.length - m));
    const high1 = new BigInteger(this.value.slice(0, this.value.length - m));
    const low2 = new BigInteger(other.value.slice(other.value.length - m));
    const high2 = new BigInteger(other.value.slice(0, other.value.length - m));

    const z0 = low1.multiply(low2);
    const z1 = low1
      .add(high1)
      .multiply(low2.add(high2))
      .subtract(z0)
      .subtract(high1.multiply(high2));
    const z2 = high1.multiply(high2);

    // Shift and add the results
    const result = z2
      .shiftLeft(2 * m * 8)
      .add(z1.shiftLeft(m * 8))
      .add(z0);
    return result;
  }

  /**
   * Shifts the BigInteger left by a specified number of bits.
   * @param bits Number of bits to shift.
   * @returns The shifted BigInteger.
   */
  shiftLeft(bits: number): BigInteger {
    const byteShift = Math.floor(bits / 8);
    const bitShift = bits % 8;
    const newValue = [...this.value];

    // Add zero bytes at the end
    for (let i = 0; i < byteShift; i++) {
      newValue.push(0);
    }

    if (bitShift > 0) {
      let carry = 0;
      for (let i = newValue.length - 1; i >= 0; i--) {
        const temp = (newValue[i] << bitShift) | carry;
        carry = temp > 0xff ? 1 : 0;
        newValue[i] = temp & 0xff;
      }
      if (carry) {
        newValue.unshift(1);
      }
    }

    return new BigInteger(newValue);
  }

  private gradeSchoolMultiply(other: BigInteger): BigInteger {
    const a = [...this.value].reverse();
    const b = [...other.value].reverse();
    const result = new Array(a.length + b.length).fill(0);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        result[i + j] += a[i] * b[j];
        // Handle carry over
        result[i + j + 1] += Math.floor(result[i + j] / 256);
        result[i + j] %= 256;
      }
    }
    // Remove leading zeros
    while (result.length > 1 && result[result.length - 1] === 0) {
      result.pop();
    }
    return new BigInteger(result.reverse());
  }

  // Compare two BigIntegers
  // Returns 1 if this > other, -1 if this < other, 0 if equal
  compare(other: BigInteger): number {
    if (this.value.length > other.value.length) return 1;
    if (this.value.length < other.value.length) return -1;
    for (let i = 0; i < this.value.length; i++) {
      if (this.value[i] > other.value[i]) return 1;
      if (this.value[i] < other.value[i]) return -1;
    }
    return 0;
  }

  // Modular exponentiation: this^exponent mod modulus
  modPow(exponent: BigInteger, modulus: BigInteger): BigInteger {
    let base = this.mod(modulus);
    let exp = exponent.copy();
    let result = new BigInteger(1);

    while (exp.isGreaterThanZero()) {
      if (exp.isOdd()) {
        result = result.multiply(base).mod(modulus);
      }
      base = base.multiply(base).mod(modulus);
      exp = exp.divide(new BigInteger(2));
    }

    return result;
  }

  // Modular inversion: this^{-1} mod modulus
  modInverse(modulus: BigInteger): BigInteger {
    const { gcd, x } = this.extendedGCD(modulus);
    if (!gcd.isOne()) {
      throw new Error('Modular inverse does not exist');
    }
    return x.mod(modulus);
  }

  // Helper methods
  isGreaterThanZero(): boolean {
    return this.compare(new BigInteger(0)) > 0;
  }

  isOdd(): boolean {
    return (this.value[this.value.length - 1] & 1) === 1;
  }

  // Inside the BigInteger class
  divide(divisor: BigInteger): BigInteger {
    if (divisor.isZero()) {
      throw new Error('Division by zero');
    }

    let dividend = this.copy();
    const divisorCopy = divisor.copy();
    let quotient = new BigInteger(0);
    const one = new BigInteger(1);

    while (dividend.compare(divisorCopy) >= 0) {
      dividend = dividend.subtract(divisorCopy);
      quotient = quotient.add(one);
    }

    return quotient;
  }

  isOne(): boolean {
    return this.compare(new BigInteger(1)) === 0;
  }

  /**
   * Checks if the BigInteger is equal to zero.
   * @returns True if equal to zero, else false.
   */
  isZero(): boolean {
    return this.value.length === 1 && this.value[0] === 0;
  }

  /**
   * Returns the bit length of the BigInteger.
   * @returns Number of bits in the BigInteger.
   */
  public bitLength(): number {
    if (this.isZero()) return 0;
    let firstByte = this.value[0];
    let bits = 0;
    while (firstByte > 0) {
      firstByte >>= 1;
      bits++;
    }
    return (this.value.length - 1) * 8 + bits;
  }

  extendedGCD(other: BigInteger): {
    gcd: BigInteger;
    x: BigInteger;
    y: BigInteger;
  } {
    let a = this.copy();
    let b = other.copy();
    let x0 = new BigInteger(1);
    let x1 = new BigInteger(0);
    let y0 = new BigInteger(0);
    let y1 = new BigInteger(1);

    while (b.isGreaterThanZero()) {
      const { quotient, remainder } = a.divmod(b);
      a = b;
      b = remainder;
      const tempX = x0.subtract(quotient.multiply(x1));
      const tempY = y0.subtract(quotient.multiply(y1));
      x0 = x1;
      x1 = tempX;
      y0 = y1;
      y1 = tempY;
    }

    return { gcd: a, x: x0, y: y0 };
  }

  // Implement copy and divmod methods
  copy(): BigInteger {
    return new BigInteger([...this.value]);
  }

  // Inside the BigInteger class
  divmod(divisor: BigInteger): { quotient: BigInteger; remainder: BigInteger } {
    if (divisor.isZero()) {
      throw new Error('Division by zero');
    }

    let dividend = this.copy();
    const divisorCopy = divisor.copy();
    let quotient = new BigInteger(0);
    const one = new BigInteger(1);

    while (dividend.compare(divisorCopy) >= 0) {
      dividend = dividend.subtract(divisorCopy);
      quotient = quotient.add(one);
    }

    return { quotient, remainder: dividend };
  }

  // Compute this mod modulus
  mod(modulus: BigInteger): BigInteger {
    const dividend = this.toBigInt();
    const divisor = modulus.toBigInt();
    const remainder = dividend % divisor;
    return BigInteger.fromBigInt(remainder);
  }

  // Convert to binary string
  toBinary(): string {
    return this.value.map((byte) => byte.toString(2).padStart(8, '0')).join('');
  }

  // Convert to BigInt
  toBigInt(): bigint {
    return BigInt(
      '0x' +
        this.value.map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    );
  }

  // Utility: Convert to hex string
  toHex(): string {
    return this.value
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Static method to create BigInteger from BigInt
  static fromBigInt(bigInt: bigint): BigInteger {
    let hex = bigInt.toString(16);
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }
    return new BigInteger(hex);
  }

  // Extended Euclidean Algorithm
  private static extendedGCD(a: bigint, b: bigint): [bigint, bigint, bigint] {
    if (b === 0n) {
      return [a, 1n, 0n];
    }
    const [gcd, x1, y1] = BigInteger.extendedGCD(b, a % b);
    const x = y1;
    const y = x1 - (a / b) * y1;
    return [gcd, x, y];
  }

  // Check if the number is prime using Miller-Rabin test
  isProbablePrime(iterations: number = 5): boolean {
    const n = this.toBigInt();
    if (n < 2n) return false;
    if (n === 2n || n === 3n) return true;
    if (n % 2n === 0n) return false;

    // Write n - 1 as 2^s * d
    let d = n - 1n;
    let s = 0n;
    while (d % 2n === 0n) {
      d /= 2n;
      s += 1n;
    }

    // Witness loop
    for (let i = 0; i < iterations; i++) {
      const a = BigInteger.randomBigInt(2n, n - 2n);
      let x = BigInt(1);
      let power = d;
      let base = a;

      while (power > 0n) {
        if (power % 2n === 1n) {
          x = (x * base) % n;
        }
        base = (base * base) % n;
        power = power / 2n;
      }

      if (x === 1n || x === n - 1n) continue;

      let continueOuter = false;
      for (let r = 0n; r < s - 1n; r++) {
        x = (x * x) % n;
        if (x === n - 1n) {
          continueOuter = true;
          break;
        }
      }
      if (continueOuter) continue;

      return false;
    }

    return true;
  }

  // Generate a random BigInt in [min, max]
  public static randomBigInt(min: bigint, max: bigint): bigint {
    if (min > max) throw new Error('min must be <= max');
    const range = max - min + 1n;
    const bitLength = range.toString(2).length;
    let rnd: bigint;
    const byteLength = Math.ceil(bitLength / 8);
    const maxBytes = (1n << BigInt(byteLength * 8)) - 1n;

    do {
      const buffer = randomBytes(byteLength);
      rnd = BigInt('0x' + buffer.toString('hex'));
    } while (rnd >= range);

    return rnd + min;
  }

  // Utility: Convert BigInteger to decimal string
  toDecimal(): string {
    return this.toBigInt().toString(10);
  }
}
