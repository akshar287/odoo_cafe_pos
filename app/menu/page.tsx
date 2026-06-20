import { getCategories, getProducts } from '@/actions/product';
import { getCoupons } from '@/actions/coupon';
import { getPaymentMethods } from '@/actions/payment-method';
import SelfOrderingClient from '@/components/self-ordering/SelfOrderingClient';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const [categories, products, coupons, paymentMethods] = await Promise.all([
    getCategories(),
    getProducts({ includeArchived: false }),
    getCoupons(),
    getPaymentMethods(),
  ]);

  return (
    <SelfOrderingClient
      categories={categories}
      products={products}
      coupons={coupons.filter((c: { active: boolean }) => c.active)}
      paymentMethods={paymentMethods.filter((p: { active: boolean }) => p.active)}
    />
  );
}
