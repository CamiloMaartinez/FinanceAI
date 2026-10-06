import { useCallback, useEffect, useState } from 'react';
import {
  getAllCategories, insertCategory, updateCategory, deleteCategory, type CategoryInput,
} from '../database/db';
import type { Category } from '../models/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setCategories(await getAllCategories());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (input: CategoryInput, id?: string) => {
    if (id) await updateCategory(id, input);
    else await insertCategory(input);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteCategory(id);
    await refresh();
  }, [refresh]);

  return { categories, isLoading, refresh, save, remove };
}
