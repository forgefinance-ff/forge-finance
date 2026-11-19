/** Quem vende o Forge Finance. CPF e endereço ficam na Vercel, fora do código. */
export const SELLER_NAME = "Thiago Paes da Costa Canto";
export const SELLER_CPF = process.env.NEXT_PUBLIC_SELLER_CPF?.trim() || null;
export const SELLER_ADDRESS = process.env.NEXT_PUBLIC_SELLER_ADDRESS?.trim() || null;

/** Ex.: "Thiago Paes da Costa Canto, CPF 000.000.000-00, Rua X, 10, Rio de Janeiro/RJ". */
export const SELLER_LINE = [SELLER_NAME, SELLER_CPF && `CPF ${SELLER_CPF}`, SELLER_ADDRESS].filter(Boolean).join(", ");
