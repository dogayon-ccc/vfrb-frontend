// Laravel returns either a bare array or a paginator ({ data: [...] }); anything else is treated as empty.
export const asList = (v) => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);
