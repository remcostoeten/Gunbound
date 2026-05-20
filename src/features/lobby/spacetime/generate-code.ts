const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/*
 *  @generateRoomCode
 *  @description Generates a random room code using the alphabet.
 *
 * @usage
 * ```ts
 * const code = generateRoomCode(5);
 * console.log(code); gives a random room code of length 5 e.g. "A1B2C"
 * ```
 */
export function generateRoomCode(length: number = 5): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/*
 *  @generateSeed
 *  @description Generates a random seed using the maximum safe integer.
 *
 * @usage
 * ```ts
 * const seed = generateSeed();
 * console.log(seed); gives a random seed e.g. 9007199254740991n
 * ```
 */
export function generateSeed(): bigint {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}
