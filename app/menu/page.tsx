import { getCategories, getProducts } from '@/actions/product';
import SelfOrderingClient from '@/components/self-ordering/SelfOrderingClient';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ includeArchived: false }),
  ]);

  return (
    <SelfOrderingClient
      categories={categories}
      products={products}
    />
  );
}
