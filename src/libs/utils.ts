type Success<T> = { success: true; value: T };
type Failure<T> = { success: false; value: T };

export type Result<T, U> = Success<T> | Failure<U>;

export const succeed = <T>(value: T): Success<T> => ({
  success: true,
  value,
});
export const fail = <T>(value: T): Failure<T> => ({
  success: false,
  value,
});
