import bcrypt from 'bcrypt';

/**
 * Hashes a plain text string using bcrypt
 * @param plainText - The plain text string to hash
 * @returns A promise that resolves to the hashed string
 */
export const hash = async (plainText: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(plainText, saltRounds);
};

/**
 * Compares a plain text string with a hash to check if they match
 * @param plainText - The plain text string to compare
 * @param hash - The hash to compare against
 * @returns A promise that resolves to a boolean indicating if the plainText matches the hash
 */
export const compare = async (plainText: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plainText, hash);
};

export default {
  hash,
  compare,
}; 