export class Algorithm {
  /**
   * Tìm phần tử trong mảng đã sắp xếp bằng binary search.
   * @param arr - Mảng đã sắp xếp
   * @param target - Giá trị cần tìm
   * @param comparator - Hàm so sánh: (a, b) => number
   *        Trả về: < 0 nếu a < b, 0 nếu a === b, > 0 nếu a > b
   * @returns Vị trí index nếu tìm thấy, -1 nếu không
   */
  static async binarySearch<T = unknown>(
    arr: T[],
    target: T,
    comparator: (a: T, b: T) => number,
  ): Promise<number> {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const compare = comparator(arr[mid], target);
      if (compare === 0) return mid;
      if (compare < 0) left = mid + 1;
      else right = mid - 1;
    }

    return -1;
  }
}
