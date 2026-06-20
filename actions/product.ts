'use server';

import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types/clerk';
import { getSession } from '@/lib/auth';

// Helper to ensure admin access
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

// CATEGORIES ACTIONS
export async function getCategories() {
  try {
    await dbConnect();
    const categories = await Category.find({}).sort({ createdAt: 1 }).lean();
    return JSON.parse(JSON.stringify(categories));
  } catch (err) {
    console.error('getCategories error:', err);
    return [];
  }
}

export async function saveCategoriesAction(
  categoriesList: Array<{ _id?: string; name: string; color: string }>
) {
  try {
    await requireAdmin();
    await dbConnect();

    const results = [];
    for (const cat of categoriesList) {
      if (cat._id && cat._id.startsWith('new_')) {
        // Create new
        const newCat = await Category.create({
          name: cat.name,
          color: cat.color,
        });
        results.push(newCat);
      } else if (cat._id) {
        // Update existing
        const updated = await Category.findByIdAndUpdate(
          cat._id,
          { name: cat.name, color: cat.color },
          { new: true }
        );
        results.push(updated);
      } else {
        // Create new (if no ID at all)
        const newCat = await Category.create({
          name: cat.name,
          color: cat.color,
        });
        results.push(newCat);
      }
    }

    revalidatePath('/backend/category');
    revalidatePath('/backend/products');
    revalidatePath('/pos');
    return { success: true, categories: JSON.parse(JSON.stringify(results)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save categories' };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    await requireAdmin();
    await dbConnect();

    // Check if any product is using this category
    const productCount = await Product.countDocuments({ category: categoryId, archived: false });
    if (productCount > 0) {
      return {
        success: false,
        error: `Cannot delete category: ${productCount} active product(s) are currently assigned to it.`,
      };
    }

    await Category.findByIdAndDelete(categoryId);
    revalidatePath('/backend/category');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category' };
  }
}

// PRODUCTS ACTIONS
export interface GetProductsFilter {
  search?: string;
  categoryId?: string;
  includeArchived?: boolean;
}

export async function getProducts(filter: GetProductsFilter = {}) {
  try {
    await dbConnect();
    const query: any = {};

    if (!filter.includeArchived) {
      query.archived = false;
    }
    if (filter.categoryId && filter.categoryId !== 'all') {
      query.category = filter.categoryId;
    }
    if (filter.search) {
      query.name = { $regex: filter.search, $options: 'i' };
    }

    // Populate category so we have name and color details
    const products = await Product.find(query)
      .populate('category')
      .sort({ createdAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(products));
  } catch (err) {
    console.error('getProducts error:', err);
    return [];
  }
}

export interface SaveProductInput {
  id?: string;
  name: string;
  price: number;
  tax: number; // 5, 12, 18, 28
  category: string; // ID of category or a new category name to create inline
  description?: string;
  isVeg: boolean;
  sendToKDS: boolean;
  unitOfMeasure?: string;
  image?: string;
}

export async function saveProductAction(input: SaveProductInput) {
  try {
    await requireAdmin();
    await dbConnect();

    let categoryId = input.category;

    // Check if the category ID is a valid ObjectId, if not, it might be a new category name to create inline
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryId);
    if (!isObjectId) {
      // Create inline category first!
      const inlineCat = await Category.create({
        name: categoryId, // categoryId is the name here
        color: '#f97316', // Default to nice coral swatch
      });
      categoryId = inlineCat._id.toString();
    }

    const productData = {
      name: input.name,
      price: input.price,
      tax: input.tax,
      category: categoryId,
      description: input.description,
      isVeg: input.isVeg,
      sendToKDS: input.sendToKDS,
      unitOfMeasure: input.unitOfMeasure || 'units',
      image: input.image,
      archived: false,
    };

    let savedProduct;
    if (input.id) {
      savedProduct = await Product.findByIdAndUpdate(input.id, productData, { new: true });
    } else {
      savedProduct = await Product.create(productData);
    }

    revalidatePath('/backend/products');
    revalidatePath('/pos');
    return { success: true, product: JSON.parse(JSON.stringify(savedProduct)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save product' };
  }
}

export async function bulkDeleteProductsAction(ids: string[]) {
  try {
    await requireAdmin();
    await dbConnect();

    await Product.deleteMany({ _id: { $in: ids } });

    revalidatePath('/backend/products');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete products' };
  }
}

export async function bulkArchiveProductsAction(ids: string[]) {
  try {
    await requireAdmin();
    await dbConnect();

    await Product.updateMany({ _id: { $in: ids } }, { archived: true });

    revalidatePath('/backend/products');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to archive products' };
  }
}
