export const menu = [
  { id: 'margherita', name: 'Margherita', description: 'Crushed tomato, fresh mozzarella and torn basil.', cents: 1600, image: '/margherita.webp' },
  { id: 'pepperoni', name: 'Pepperoni', description: 'Crispy pepperoni cups, mozzarella and crushed tomato.', cents: 1800, image: '/pepperoni.webp' },
  { id: 'mushroom', name: 'Mushroom', description: 'Roasted mushrooms, garlic cream, mozzarella and thyme.', cents: 1900, image: '/mushroom.webp' },
] as const

export type PizzaId = typeof menu[number]['id']
export type Cart = Partial<Record<PizzaId, number>>
export const maxQuantity = 12
export const pickup = 'Weekend Crust Pizza · Test pickup counter'

export const money = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0,
}).format(cents / 100)

export function orderItems(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const cart = value as Record<string, unknown>
  if (Object.keys(cart).some(id => !menu.some(pizza => pizza.id === id))) return null
  const items = []
  for (const pizza of menu) {
    if (!Object.hasOwn(cart, pizza.id)) continue
    const quantity = cart[pizza.id]
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) ||
      quantity < 1 || quantity > maxQuantity) return null
    items.push({ id: pizza.id, name: pizza.name, cents: pizza.cents, quantity })
  }
  return items.length ? items : null
}
