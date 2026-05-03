export async function handleStripeEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      console.log('[stripe:webhook]', event.type, event.id)
      break
    default:
      console.log('[stripe:webhook] ignored', event.type, event.id)
  }
}
