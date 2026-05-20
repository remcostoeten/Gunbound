"use client";

import { useCallback, useMemo } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

import { tables } from "../module_bindings";

const EMPTY_DATA_SETTING_KEY = "empty_data_enabled";

type UseEmptyDataModeResult = {
  enabled: boolean;
  isReady: boolean;
  setEnabled(enabled: boolean): Promise<void>;
};

export function useEmptyDataMode(): UseEmptyDataModeResult {
  const connection = useSpacetimeDB();
  const query = useMemo(
    () => tables.appSetting.where((row) => row.key.eq(EMPTY_DATA_SETTING_KEY)),
    [],
  );
  const [rows, isReady] = useTable(query);

  const enabled = rows.some((row) => row.value === "true");

  const setEnabled = useCallback(
    async (nextEnabled: boolean) => {
      const conn = connection.getConnection();
      if (!conn) return;
      await conn.reducers.setEmptyDataEnabled({ enabled: nextEnabled });
    },
    [connection],
  );

  return { enabled, isReady, setEnabled };
}

