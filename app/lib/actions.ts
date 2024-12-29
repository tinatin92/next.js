'use server';
 
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
 
// ...
export async function createInvoice(prevState: State, formData: FormData) {

    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    


  try {
    const { error } = await supabase
      .from('invoices') // Specify the table name
      .insert({
        customer_id: customerId,
        amount: amountInCents,
        status,
        date,
      });

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw new Error('Failed to create invoice.');
    }
  } catch (err) {
    console.error('Unexpected Error:', err);
    throw new Error('An unexpected error occurred while creating the invoice.');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');

  }


  // Use Zod to update the expected types

 
// ...
 
const UpdateInvoice = z.object({
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
});

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    const { error } = await supabase
      .from('invoices') // Specify the table name
      .update({
        customer_id: customerId,
        amount: amountInCents,
        status,
      })
      .eq('id', id); // Match the record by `id`

    if (error) {
      console.error('Supabase Update Error:', error);
      throw new Error('Failed to update the invoice.');
    }

    // Revalidate and redirect
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  } catch (err) {
    console.error('Unexpected Error:', err);
    throw new Error('An unexpected error occurred while updating the invoice.');
  }
}

export async function deleteInvoice(id: string) {
  try {
    const { error } = await supabase
      .from('invoices') // Specify the table name
      .delete() // Delete operation
      .eq('id', id); // Match the record by `id`

    if (error) {
      console.error('Supabase Delete Error:', error);
      throw new Error('Failed to delete the invoice.');
    }

    // Revalidate the dashboard path
    revalidatePath('/dashboard/invoices');
  } catch (err) {
    console.error('Unexpected Error:', err);
    throw new Error('An unexpected error occurred while deleting the invoice.');
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}