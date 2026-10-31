import type { Db } from './database';
import type { DashboardData, SearchResult } from '../../shared/types';
export declare function buildDashboard(db: Db): DashboardData;
export declare function globalSearch(db: Db, query: string): SearchResult;
