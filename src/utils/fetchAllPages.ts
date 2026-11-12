import axios from 'axios';
import { asList } from './asList';

// Customer list endpoints have no server clamp; 100 matches the app's other list caps.
export const MAX_PER_PAGE = 100, MAX_PAGES = 10;

// Every row of a Laravel-paginated GET (follows last_page, at most MAX_PAGES); a plain array response is returned as is.
export async function fetchAllPages(url, { get = axios.get, perPage = MAX_PER_PAGE, maxPages = MAX_PAGES } = {}) {
  const page = (n) => get(url, { params: { per_page: perPage, page: n } }).then(r => r.data);
  const first = await page(1);
  const last = Math.min(Number(first?.last_page) || 1, maxPages);
  const rest = last > 1 ? await Promise.all(Array.from({ length: last - 1 }, (_, i) => page(i + 2))) : [];
  return [first, ...rest].flatMap(asList);
}
