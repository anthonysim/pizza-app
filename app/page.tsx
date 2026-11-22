import { menu, money } from '../lib/menu'
import { getSession } from '../lib/session'
import { isStaff } from '../lib/orders'
import { AddPizza, Storefront } from './storefront'

export default async function Home() {
  const session = await getSession()
  const staff = session ? await isStaff(session.token) : false
  return <Storefront customerId={session?.user.id} staff={staff}>
    <main>
      <section className="hero">
        <div className="hero-photo">
          <img src="/hero.webp" alt="" fetchPriority="high" />
        </div>
        <div className="wrap hero-copy">
          <p className="eyebrow"><span aria-hidden="true">✳</span> WEEKEND CRUST PIZZA</p>
          <h1>THREE PIES.<br /><em>ONE GOOD NIGHT.</em></h1>
          <p className="hero-description">Three 12-inch pizzas, baked to order.<br />Order online and pick up at the counter.</p>
          <a className="button primary" href="#menu">Explore the menu</a>
        </div>
      </section>

      <section id="menu" className="wrap menu-section">
        <div className="section-heading">
          <h2>THE MENU <span aria-hidden="true">✳</span></h2>
          <p>12″ pies <span aria-hidden="true">·</span> Pickup only</p>
        </div>
        <div className="pizza-grid">
          {menu.map(pizza => <article className="pizza-card" key={pizza.id}>
            <div className="pizza-photo">
              <img src={pizza.image} alt={`${pizza.name} pizza`} loading="lazy" decoding="async" />
            </div>
            <div className="pizza-copy">
              <div className="pizza-name"><h3>{pizza.name}</h3><span>{money(pizza.cents)}</span></div>
              <p>{pizza.description}</p>
              <AddPizza id={pizza.id} name={pizza.name} />
            </div>
          </article>)}
        </div>
      </section>
    </main>
  </Storefront>
}
