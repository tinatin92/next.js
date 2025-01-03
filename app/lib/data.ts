import { sql } from '@vercel/postgres';
import { supabase } from '@/supabaseClient';





import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

/* export async function fetchRevenue() {

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue>`SELECT * FROM revenue`;

    // console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}
 */


export async function fetchRevenue() {
  try {
    const { data, error } = await supabase.from('revenue').select('*');
    if (error) {
      console.error('Supabase Query Error:', error.message);
      throw new Error('Failed to fetch revenue data.');
    }
    return data;
  } catch (error) {
    console.error('Fetch Revenue Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

// export async function fetchLatestInvoices() {
//   try {
//     const data = await sql<LatestInvoiceRaw>`
//       SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
//       FROM invoices
//       JOIN customers ON invoices.customer_id = customers.id
//       ORDER BY invoices.date DESC
//       LIMIT 5`;

//     const latestInvoices = data.rows.map((invoice) => ({
//       ...invoice,
//       amount: formatCurrency(invoice.amount),
//     }));
//     return latestInvoices;
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch the latest invoices.');
//   }
// }


 
// type Customer = {
//   name: string;
//   image_url: string;
//   email: string;
// }

// type Invoice = {
//   id: string;
//   amount: number;
//   customers: Customer;
// }

// type FormattedInvoice = {
//   id: string;
//   amount: string; // formatted currency string
//   name: string;
//   image_url: string;
//   email: string;
// }

/* export async function fetchLatestInvoices(): Promise<FormattedInvoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        amount,
        id,
        customers (
          name,
          image_url,
          email
        )
      `)
      .order('date', { ascending: false })
      .limit(5)
      .returns<Invoice[]>();

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    const latestInvoices = data.map((invoice) => ({
      id: invoice.id,
      amount: formatCurrency(invoice.amount),
      name: invoice.customers.name,
      image_url: invoice.customers.image_url,
      email: invoice.customers.email,
    }));

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
} */


//   export async function fetchCardData() {
//   try {
//     // You can probably combine these into a single SQL query
//     // However, we are intentionally splitting them to demonstrate
//     // how to initialize multiple queries in parallel with JS.
//     const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
//     const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
//     const invoiceStatusPromise = sql`SELECT
//          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
//          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
//          FROM invoices`;

//     const data = await Promise.all([
//       invoiceCountPromise,
//       customerCountPromise,
//       invoiceStatusPromise,
//     ]);

//     const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
//     const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
//     const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
//     const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

//     return {
//       numberOfCustomers,
//       numberOfInvoices,
//       totalPaidInvoices,
//       totalPendingInvoices,
//     };
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch card data.');
//   }
// }


export async function fetchCardData() {
  try {
    // Create all promises to run in parallel
    const invoiceCountPromise = supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    const customerCountPromise = supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const invoiceStatusPromise = supabase
      .from('invoices')
      .select('status, amount');

    // Execute all promises in parallel
    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    // Handle potential errors
    if (invoiceCount.error) throw invoiceCount.error;
    if (customerCount.error) throw customerCount.error;
    if (invoiceStatus.error) throw invoiceStatus.error;

    // Calculate paid and pending amounts
    const paidAmount = invoiceStatus.data
      ?.filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0) ?? 0;

    const pendingAmount = invoiceStatus.data
      ?.filter(invoice => invoice.status === 'pending')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0) ?? 0;

    return {
      numberOfCustomers: customerCount.count ?? 0,
      numberOfInvoices: invoiceCount.count ?? 0,
      totalPaidInvoices: formatCurrency(paidAmount),
      totalPendingInvoices: formatCurrency(pendingAmount),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
// export async function fetchFilteredInvoices(
//   query: string,
//   currentPage: number,
// ) {
//   const offset = (currentPage - 1) * ITEMS_PER_PAGE;

//   try {
//     const invoices = await sql<InvoicesTable>`
//       SELECT
//         invoices.id,
//         invoices.amount,
//         invoices.date,
//         invoices.status,
//         customers.name,
//         customers.email,
//         customers.image_url
//       FROM invoices
//       JOIN customers ON invoices.customer_id = customers.id
//       WHERE
//         customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`} OR
//         invoices.amount::text ILIKE ${`%${query}%`} OR
//         invoices.date::text ILIKE ${`%${query}%`} OR
//         invoices.status ILIKE ${`%${query}%`}
//       ORDER BY invoices.date DESC
//       LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
//     `;

//     return invoices.rows;
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch invoices.');
//   }
// }


export async function fetchFilteredInvoices(query: string, currentPage: number) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
          id,
          amount,
          date,
          status,
          customers!inner(name, email, image_url)
        `
      )
      .or(
        `customers.name.ilike.%${query}%,` +
        `customers.email.ilike.%${query}%,` +
        `amount::text.ilike.%${query}%,` +
        `date::text.ilike.%${query}%,` +
        `status.ilike.%${query}%`
      )
      .order('date', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) {
      console.error('Supabase Error:', error);
      throw new Error('Failed to fetch invoices.');
    }

    return data;
  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error('An unexpected error occurred while fetching invoices.');
  }
}

// export async function fetchInvoicesPages(query: string) {
//   try {
//     const count = await sql`SELECT COUNT(*)
//     FROM invoices
//     JOIN customers ON invoices.customer_id = customers.id
//     WHERE
//       customers.name ILIKE ${`%${query}%`} OR
//       customers.email ILIKE ${`%${query}%`} OR
//       invoices.amount::text ILIKE ${`%${query}%`} OR
//       invoices.date::text ILIKE ${`%${query}%`} OR
//       invoices.status ILIKE ${`%${query}%`}
//   `;

//     const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
//     return totalPages;
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch total number of invoices.');
//   }
// }

// export async function fetchInvoiceById(id: string) {
//   try {
//     const data = await sql<InvoiceForm>`
//       SELECT
//         invoices.id,
//         invoices.customer_id,
//         invoices.amount,
//         invoices.status
//       FROM invoices
//       WHERE invoices.id = ${id};
//     `;

//     const invoice = data.rows.map((invoice) => ({
//       ...invoice,
//       // Convert amount from cents to dollars
//       amount: invoice.amount / 100,
//     }));

//     return invoice[0];
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch invoice.');
//   }
// }
export async function fetchInvoiceById(id: string) {
  try {
    const { data, error } = await supabase
      .from('invoices') // Specify the table
      .select('id, customer_id, amount, status') // Specify the fields to fetch
      .eq('id', id) // Filter by ID
      .single(); // Retrieve a single record

    if (error) {
      console.error('Supabase Fetch Error:', error);
      throw new Error('Failed to fetch invoice.');
    }

    // Convert amount from cents to dollars
    const invoice = {
      ...data,
      amount: data?.amount ? data.amount / 100 : 0,
    };

    return invoice;
  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error('An unexpected error occurred while fetching the invoice.');
  }
}
// export async function fetchCustomers() {
//   try {
//     const data = await sql<CustomerField>`
//       SELECT
//         id,
//         name
//       FROM customers
//       ORDER BY name ASC
//     `;

//     const customers = data.rows;
//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch all customers.');
//   }
// }
export async function fetchCustomers() {
  try {
    const { data, error } = await supabase
      .from('customers') // Specify the table name
      .select('id, name') // Specify the fields to fetch
      .order('name', { ascending: true }); // Order by name in ascending order

    if (error) {
      console.error('Supabase Error:', error);
      throw new Error('Failed to fetch all customers.');
    }

    return data;
  } catch (err) {
    console.error('Unexpected Error:', err);
    throw new Error('An unexpected error occurred while fetching customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
