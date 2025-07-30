export function flattenJson(obj, prefix = '') {
  let result = {};

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    const val = obj[key];
    const newKey = prefix ? (Number.isInteger(+key) ? `${prefix}[${key}]` : `${prefix}.${key}`) : key;

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenJson(val, newKey));
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => {
        if (typeof item === 'object') {
          Object.assign(result, flattenJson(item, `${newKey}[${index}]`));
        } else {
          result[`${newKey}[${index}]`] = item;
        }
      });
    } else {
      result[newKey] = val;
    }
  }

  return result;
}
