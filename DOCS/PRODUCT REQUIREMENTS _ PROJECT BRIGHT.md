**PRODUCT REQUIREMENTS**  
 **DOCUMENT**

**Retail Supply & Fulfillment Platform**

Working title: Retail Supply & Fulfillment Platform

A voice-first service that lets small retailers ask for what they need and have it sourced, coordinated and delivered with minimal effort.

| Document purpose This PRD translates the product decisions made during discovery into a clear product definition. It is deliberately non-technical: it describes what the product should do, who it is for, how the experience should work, and what should be built first. |
| :---- |

 

| Document item | Value |
| :---- | :---- |
| Primary customer | Small shops and independent retailers in Ghana, with an eventual Africa-wide expansion path |
| Primary launch use case | Retailer restocking |
| Core promise | Tell us what you need. We find it, coordinate it and deliver it. |
| Product approach | Voice-first, but also supports text and browsing |
| Business model | Supplier commission \+ logistics margin \+ service fees where appropriate |
| Initial operating model | Asset-light; no company-owned inventory at launch |
| Status | Product definition / pre-build |
| Date | 25 September 2026 |

 

# **1\. Executive Summary**

The product is a voice-first supply and fulfillment platform designed initially for small shops and retailers in Ghana. Retailers often restock through fragmented channels: phone calls, WhatsApp messages, visits to distributors and warehouses, separate transport arrangements, and manual follow-up. The product brings these activities into one simple experience.

| Core customer experience A retailer says, types or selects what they need. The platform finds suitable suppliers, confirms availability and prices, combines products from multiple suppliers into one order when necessary, collects payment once, coordinates transportation and delivers to the retailer within a confirmed delivery window. |
| :---- |

 

The long-term product goes beyond inbound restocking. It can become an operating layer for small retailers by helping them fulfill orders to their own customers through delivery-only or full pick, pack and delivery services, and eventually by coordinating inventory held at partner fulfillment centers.

The product should hide operational complexity from the retailer. The core design principle is: the retailer should deal with one platform, while the platform coordinates the suppliers, warehouses, transporters and fulfillment providers behind the scenes.

# **2\. Product Vision**

| Vision statement Make business restocking and fulfillment feel as simple as asking someone you trust to handle it for you. |
| :---- |

 

The platform should remove the need for small retailers to coordinate multiple suppliers, transporters and fulfillment providers themselves. Instead of asking customers to learn a new procurement process, it should fit naturally into the way they already work: speak, type, browse, confirm and pay.

# **3\. Problem to Solve**

Small retailers can struggle with a fragmented supply process. A single restocking trip or order may require multiple supplier conversations, checking availability, negotiating or comparing prices, arranging transport, collecting products from different places, reconciling quantities, and resolving problems after delivery.

The product is intended to reduce that coordination burden while retaining transparency and customer control.

| Problem | What the product should do |
| :---- | :---- |
| Too many supplier conversations | Let the retailer make one request and let the platform coordinate multiple suppliers. |
| Uncertain availability | Check supplier availability before the retailer pays. |
| Separate transport arrangements | Coordinate pickup, consolidation and delivery through the platform. |
| Too many payments | Collect one payment from the retailer and show how the amount is distributed. |
| Hard-to-track orders | Show useful progress by item, supplier and fulfillment stage. |
| Problems after delivery | Give the retailer one place to report shortages, damage, wrong items and other issues. |
| Repetitive restocking | Remember purchase history and preferences and support repeat orders. |

 

# **4\. Product Goals and Non-Goals**

## **4.1 Goals**

·       Make retailer restocking dramatically easier than the current fragmented process.

·       Make voice a natural and powerful way to place an order.

·       Allow one order to be fulfilled across multiple suppliers when required.

·       Give retailers one clear price, one payment and one customer-support relationship.

·       Build trust through transparent product prices, delivery charges, supplier information and order status.

·       Create a foundation for outbound retail fulfillment and broader 3PL services later.

·       Start asset-light and use real purchasing data to decide what should be added later.

## **4.2 Non-Goals at Launch**

·       Owning and storing a broad range of inventory ourselves.

·       Full inventory management for retailers.

·       Multiple delivery locations within one order.

·       Full live vehicle tracking for every delivery.

·       Automatic direct connections to every retailer sales channel.

·       A full warehouse management proposition owned and operated by the platform.

·       Forcing every retailer to use full pick-and-pack fulfillment.

# **5\. Target Users**

| User | Needs | Product response |
| :---- | :---- | :---- |
| Primary: small shop owner | Fast restocking, low effort, reliable delivery, transparent pricing | Voice/text/browse ordering, saved preferences, one payment, coordinated delivery |
| Shop manager / purchasing staff | Ability to prepare orders within the shop’s rules | Role-based permissions, spending limits and approval flows |
| Supplier / distributor | Reliable orders and clear fulfillment expectations | Order confirmation, preparation workflow, standard response time, supplier profile |
| Transport / 3PL provider | Clear pickup and delivery jobs | Platform-coordinated jobs, pickup readiness and delivery information |
| Retailer’s customer (future) | Reliable delivery from the retailer | Outbound delivery and eventually pick/pack/ship services |

 

# **6\. Product Principles**

| Principle | Meaning |
| :---- | :---- |
| Voice first, not voice only | Speaking should be the easiest experience, but customers can always type or browse. |
| Ask only when necessary | The platform should infer what it can from context, history and preferences, and ask short clarification questions only when required. |
| One order, one payment | The retailer should not have to coordinate multiple suppliers or payments for a normal request. |
| Platform owns the journey | The customer should not be sent supplier-to-supplier when something goes wrong. |
| Customer stays in control | Automation should make things easier, not silently make important choices. |
| Hide complexity | Supplier sourcing, pickup routing, consolidation and provider coordination should happen behind the scenes. |
| Start simple, learn, then automate | Launch with the smallest useful product and use transaction history to add smart features later. |

 

# **7\. Core Customer Journey**

1\.  	Retailer opens the product or uses the preferred interaction channel.

2\.  	Retailer speaks, types or browses to create a supply request.

3\.  	Platform interprets the request and uses purchase history and saved preferences where available.

4\.  	Platform checks nearby approved suppliers and confirms availability, quantities and current prices.

5\.  	Where needed, the platform searches multiple suppliers and builds one consolidated order.

6\.  	For unavailable items, the platform shows available quantities and relevant alternatives; the retailer decides how to proceed.

7\.  	Retailer reviews the final order, requested delivery window and total price.

8\.  	Retailer pays the platform once using mobile money, bank card or bank transfer.

9\.  	Suppliers confirm and prepare the relevant items for pickup.

10\.   If a supplier does not respond within the agreed time, the platform looks for another suitable supplier and asks the retailer to approve any material change.

11\.   Transport is coordinated through the platform’s own or approved third-party capacity.

12\.   Products from different suppliers are consolidated where needed and delivered to the retailer’s single saved delivery location.

13\.   Retailer sees detailed order progress and receives important updates through the platform, WhatsApp and SMS.

14\.   If there is a problem, the retailer reports it through the platform, which manages the resolution, replacement or refund process.

# **8\. Feature Map by Product Stage**

| Capability | Launch | Next | Later |
| :---- | :---- | :---- | :---- |
| Voice ordering | Yes | Improve | Improve and personalize |
| Text ordering | Yes | Improve | Improve |
| Product browsing | Yes | Improve | Personalized discovery |
| Saved products / suppliers | Yes | Improve | Smarter recommendations |
| Repeat order / Buy again | Yes | Improve | Automated suggested repeats |
| Recurring orders | Yes | Improve | Predictive replenishment suggestions |
| Multi-supplier order consolidation | Yes | Improve | More automated orchestration |
| Product substitutions | Yes, customer chooses | Improve | Preference-based recommendations |
| Immediate delivery | Yes where available | Improve coverage | More service levels |
| Scheduled delivery windows | Yes | Improve | More precise options |
| Detailed order tracking | Yes | Improve | Optional live tracking for selected deliveries |
| Returns / refunds | Yes | Improve | More automated resolution |
| Inventory management | No | Basic later | Smart inventory / replenishment |
| Outbound delivery for retailer customers | No, roadmap | Pilot | Full service |
| Pick, pack \+ delivery | No, roadmap | Pilot | Scale |
| Partner-warehouse fulfillment | No | Pilot | Scale |
| Multiple delivery locations | No | Pilot | Scale |

 

# **9\. Functional Requirements**

## **9.1 Retailer Account and Onboarding**

·       A retailer can create an account using basic information needed to start ordering.

·       The retailer can save its shop name, contact information, primary delivery location and delivery instructions.

·       The retailer can provide landmarks or other practical directions for delivery.

·       The platform can gradually collect and verify additional business information as the retailer becomes an active customer.

·       A retailer can add staff and control who may create orders, approve them or pay for them.

·       The retailer can set spending limits or approval rules for staff.

## **9.2 Product Request and Ordering**

·       Retailers can place requests by voice, text or browsing products.

·       The platform can understand natural-language requests such as product, quantity, timing and location.

·       The platform uses saved purchase history and preferences to reduce unnecessary questions.

·       For unclear requests, the platform asks a focused clarification question or presents a small number of relevant choices.

·       Retailers can request products that are not currently in the supplier network; the platform records the request for sourcing.

·       Retailers can choose immediate or scheduled delivery where available.

·       Retailers can request a delivery window; the platform confirms what is actually possible.

## **9.3 Product, Supplier and Price Selection**

·       The platform checks availability before the customer pays.

·       The platform can compare multiple approved suppliers for the same requested product.

·       The platform recommends a suitable supplier while allowing the retailer to choose another option.

·       Suppliers set their own product prices initially.

·       The customer sees individual product prices and relevant supplier information.

·       Retailers can save preferred products, brands and suppliers.

·       The platform can recommend a different supplier when it is materially better, while leaving the final choice to the customer.

## **9.4 Unavailable Items and Substitutions**

·       If only part of the requested quantity is available, the platform can fulfill the available quantity and suggest alternatives for the remainder.

·       The retailer can accept an alternative, accept a partial quantity, choose another option or wait.

·       Substitutions should not happen silently where the change is material.

·       The platform can use retailer preferences to make better substitution suggestions over time.

## **9.5 Multi-Supplier Ordering**

·       A single retailer request can contain products from more than one supplier.

·       The platform combines these items into one customer-facing order.

·       The platform coordinates supplier preparation and transporter pickup across the order.

·       The customer sees one final total and pays once.

·       The customer can see how the order amount is distributed across suppliers.

## **9.6 Payment**

·       The platform supports mobile money, bank cards and bank transfer at launch.

·       The customer reviews the final order before payment under the normal flow.

·       The customer sees product costs, delivery charges, other applicable charges and the total.

·       The customer can see supplier-level payment allocation for transparency.

·       A faster confirmation path can be used for trusted repeat orders once the customer enables it.

## **9.7 Supplier Fulfillment**

·       Suppliers receive the relevant part of the order.

·       Suppliers confirm whether they can fulfill their assigned items.

·       Suppliers pick and prepare items so they are ready for pickup.

·       Suppliers have a standard response time.

·       If a supplier does not respond in time, the platform looks for another suitable supplier.

·       If the replacement changes price, product, quantity or delivery timing, the retailer is asked to approve the change.

## **9.8 Transportation and Delivery**

·       The platform uses a hybrid transportation network made up of company-owned capacity and approved third-party providers.

·       The platform coordinates pickup from one or more suppliers and delivery to the retailer.

·       The platform presents one customer-facing delivery fee.

·       The underlying delivery economics can reflect the actual complexity of the job.

·       The retailer can choose a requested delivery window; the platform confirms availability.

·       The initial experience supports one delivery location per order.

·       The retailer can save and edit its address and delivery instructions.

·       The retailer receives detailed progress updates from order confirmation through delivery.

## **9.9 Order Changes and Cancellation**

·       Retailers can change an order until fulfillment begins.

·       After an order changes, the platform rechecks availability, pricing and delivery implications.

·       Free cancellation is available before fulfillment begins.

·       After fulfillment begins, the retailer can still request cancellation and is shown any applicable costs before confirming.

## **9.10 Returns, Refunds and Problems**

·       Retailers can report missing, damaged, incorrect or otherwise problematic items through the platform.

·       The platform manages the resolution with the relevant supplier or delivery provider.

·       Returns, replacements, partial refunds and full refunds can be handled within the order experience.

·       The retailer should not need to manage separate support processes with different suppliers.

## **9.11 Retailer Outbound Fulfillment (Future)**

·       A retailer can bring an order from WhatsApp, phone, social media, website or another sales channel into the platform.

·       The retailer can choose delivery-only fulfillment when the package is already prepared.

·       The retailer can choose full pick, pack and delivery when the platform or a partner has the required stock access.

·       Future phases can support retailer inventory stored at partner fulfillment centers.

## **9.12 Communication**

·       The platform is the primary place to manage an order.

·       Important events are also communicated through WhatsApp and SMS.

·       Notifications cover confirmation, supplier progress, changes, dispatch, delivery and important exceptions.

## **9.13 Ratings and Quality**

·       Retailers can rate suppliers and delivery providers after an order.

·       Feedback can include service and order-quality dimensions.

·       The platform uses feedback internally to improve recommendations and monitor provider quality.

# **10\. Core Business Rules**

| Rule | Requirement |
| :---- | :---- |
| Availability before payment | The platform should confirm product availability and current price before the retailer pays. |
| One customer order | Products from several suppliers can be grouped into one retailer-facing order. |
| One customer payment | The retailer normally pays the platform once for the complete order. |
| Transparent pricing | Product prices, delivery charges and applicable fees are visible before payment. |
| Supplier choice | The platform recommends a supplier, but the retailer can choose another available option. |
| Supplier non-response | A supplier that misses the standard response time can be replaced by another suitable supplier. |
| Material changes need approval | A change to product, price, quantity or delivery timing requires retailer approval. |
| Unavailability | Available quantities can be supplied while alternatives are offered for the balance. |
| One location initially | Each order has one delivery destination at launch. |
| Change window | Order edits are permitted until fulfillment begins. |
| Cancellation | Free before fulfillment; applicable costs disclosed after fulfillment begins. |
| Customer support ownership | The platform owns the resolution journey for problems. |
| Asset-light launch | The company does not buy and hold broad inventory at launch. |

 

# **11\. Operating Model**

| Party | Primary responsibility |
| :---- | :---- |
| Retailer | Describe what is needed, review/approve the order, pay, receive the goods, and report problems. |
| Platform | Interpret requests, find suppliers, compare options, coordinate orders, collect payment, manage logistics and own customer support. |
| Supplier | Confirm availability, prepare the assigned items and make them ready for pickup. |
| Transport / 3PL provider | Collect products from suppliers, move and consolidate them as required, and deliver to the retailer or retailer’s customer in future phases. |
| Partner fulfillment center (future) | Store retailer inventory and support pick, pack and dispatch for outbound customer orders. |

 

# **12\. Key User Journeys**

## **12.1 New retailer, simple restocking order**

1\.  	Retailer signs up with basic business and delivery information.

2\.  	Retailer says what is needed and when it should arrive.

3\.  	Platform finds approved suppliers and confirms availability and prices.

4\.  	Retailer reviews the final order and pays once.

5\.  	Platform coordinates supplier preparation and delivery.

6\.  	Retailer receives the order and can report any issue through the platform.

## **12.2 Repeat order**

1\.  	Retailer opens a previous order or says “repeat my usual order.”

2\.  	Platform reconstructs the request using saved preferences.

3\.  	Platform checks current availability, pricing and delivery options.

4\.  	Retailer confirms using the normal review flow or enabled quick checkout.

5\.  	The order is fulfilled and tracked as usual.

## **12.3 Multi-supplier order**

1\.  	Retailer requests several products in one sentence or order.

2\.  	Platform finds the best available sources across multiple approved suppliers.

3\.  	Customer sees one order with supplier details and one final total.

4\.  	Platform coordinates several supplier pickups.

5\.  	Products are consolidated and delivered to one retailer location.

## **12.4 Supplier failure**

1\.  	Supplier receives an assigned order and fails to confirm within the standard response time.

2\.  	Platform looks for another suitable supplier.

3\.  	If nothing material changes, fulfillment continues without burdening the retailer.

4\.  	If price, product, quantity or delivery changes, the retailer is asked to approve the new option.

# **13\. Launch Scope**

| Launch definition The first version should prove one thing extremely well: a small retailer can describe a restocking need in ordinary language and the platform can turn it into a confirmed, paid, coordinated delivery with very little effort. |
| :---- |

 

| Launch area | Must support |
| :---- | :---- |
| Retailer | Simple signup, saved address, staff permissions and approval rules |
| Ordering | Voice, text and browse |
| Product matching | Natural-language interpretation, saved preferences, clarification when needed |
| Supply | Approved supplier network, availability checks, supplier recommendation, customer choice |
| Order composition | Multi-supplier orders combined into one customer order |
| Pricing | Itemized product prices \+ delivery \+ other charges \+ clear total |
| Payment | Mobile money, cards, bank transfer |
| Fulfillment | Supplier confirmation and preparation, coordinated pickup, delivery |
| Delivery | Immediate or scheduled delivery, requested delivery window, one location |
| Tracking | Detailed order progress |
| Support | Problems, returns, replacements and refunds managed through platform |
| Communication | Platform \+ important WhatsApp/SMS notifications |
| Retention | Saved preferences, buy again and recurring orders |
| Trust | Supplier approval and retailer ratings/reviews |

 

# **14\. Product Roadmap**

| Phase | Focus | Illustrative capabilities |
| :---- | :---- | :---- |
| Phase 1: Launch | Make restocking seamless | Voice-first orders, supplier matching, multi-supplier consolidation, one payment, coordinated delivery, support, repeat orders |
| Phase 2: Improve | Increase repeat usage and service quality | Smarter preferences, better supplier recommendations, richer recurring orders, stronger exception handling, wider provider coverage |
| Phase 3: Fulfillment | Expand beyond inbound restocking | Retailer customer orders, delivery-only service, pick/pack/delivery pilots, partner fulfillment centers |
| Phase 4: Intelligence | Use history to reduce retailer effort | Smart replenishment suggestions, substitution preferences, demand-based recommendations, more automated restocking |
| Phase 5: Scale | Become retailer operating infrastructure | Multi-location delivery, broader 3PL services, partner inventory, more sales-channel connections, expansion into additional markets |

 

# **15\. Success Measures**

The first version should be judged on whether it makes restocking easier, more reliable and more repeatable. Suggested measures are listed below; exact numerical targets should be set after pilot data is available.

| Outcome | What to measure |
| :---- | :---- |
| Ease of ordering | Share of users who complete a first order successfully; time from request to confirmed order |
| Voice usefulness | Share of voice requests that can be turned into an accurate proposed order without manual intervention |
| Fulfillment reliability | Order fill rate; delivery success rate; order accuracy rate |
| Speed | Time from request to availability confirmation; time from confirmed order to delivery |
| Customer trust | Problem rate; refund resolution time; customer satisfaction after delivery |
| Repeat behavior | Repeat order rate; buy-again usage; recurring order adoption |
| Supplier quality | Confirmation rate; preparation accuracy; supplier-related issue rate |
| Logistics quality | On-time delivery rate; failed pickup rate; damage rate |
| Economics | Gross margin per order; average order value; delivery contribution; supplier commission revenue |

 

# **16\. Launch Readiness Criteria**

·       A retailer can complete the full journey from request to payment without needing to coordinate suppliers manually.

·       The platform can handle a request containing products sourced from multiple suppliers.

·       Availability and price are confirmed before payment.

·       The retailer receives a clear final price with itemized product costs and delivery charges.

·       The platform can handle supplier non-response without leaving the retailer waiting indefinitely.

·       The retailer can track order progress and receive important notifications.

·       The retailer can report delivery or product issues and start a refund/return process through one place.

·       The service can consistently deliver to the agreed location and delivery window within the pilot area.

·       Supplier and transport partners meet agreed service standards during the pilot.

·       The team can measure core operating and customer outcomes from the first live orders.

# **17\. Key Risks and Product Responses**

| Risk | Potential impact | Product response |
| :---- | :---- | :---- |
| Unreliable supplier availability | Customer loses trust if confirmed items later disappear | Confirm availability before payment; use alternate suppliers; supplier quality monitoring |
| Supplier delays | Delivery windows become unreliable | Standard response time; automatic supplier replacement |
| Multi-supplier logistics becomes too expensive | Poor unit economics | Show one simple delivery price to customers but monitor underlying cost; use minimums selectively where required |
| Wrong / damaged items | Support burden and customer frustration | Platform-owned problem resolution; supplier and delivery quality monitoring |
| Retailers do not trust a new platform with payments | Low conversion | Transparent pricing, supplier details, visible order status and clear refunds |
| Voice interpretation is inaccurate | Wrong orders | Ask targeted clarification questions; require review before payment in normal flow |
| Too much complexity at launch | Slow rollout and poor user experience | Keep launch focused on restocking; delay inventory management and broader fulfillment features |

 

# **18\. Open Product Decisions for the Next Discovery Cycle**

The 41 discovery questions captured in this PRD define the main product direction. The following areas still need evidence, testing or commercial decisions before launch:

·       Which product categories should be supported first in the pilot?

·       Which geographic area should be the first service zone?

·       What delivery windows and service levels can the operating model reliably support?

·       What supplier standards and verification checks should be required?

·       What exact commission, logistics margin and service-fee structure creates healthy unit economics without hurting retailer adoption?

·       What supplier and transporter commercial agreements are needed?

·       What are the rules for partial refunds, returns and damaged goods in specific product categories?

·       What level of customer support is needed for pilot versus scale?

·       Which WhatsApp and SMS moments are essential versus optional?

·       What retailer purchasing history is needed before introducing smart replenishment or automatic substitution permissions?

# **19\. Decision Log from Product Discovery**

The log below consolidates the 41 discovery questions into 43 specific product and operating decisions used in this PRD.

| \# | Decision |
| :---- | :---- |
| 1 | Primary launch customer: small shops / retailers. |
| 2 | Start with approved supplier network, while allowing requests for items outside the network. |
| 3 | Hybrid supplier choice: platform recommends; retailer can choose. |
| 4 | Pricing is itemized, with one clear total including delivery and other charges. |
| 5 | Ordering supports voice, text and browsing, with voice as the main experience. |
| 6 | Remember purchase history and preferences for repeat restocking. |
| 7 | One order can combine products from multiple suppliers. |
| 8 | Customer can request a delivery window; platform confirms feasibility. |
| 9 | One payment to the platform; show how payment is distributed among suppliers. |
| 10 | Hybrid transportation network: company capacity \+ approved third parties. |
| 11 | Detailed order tracking at launch; live tracking can come later. |
| 12 | No inventory management at launch; smart inventory can come later. |
| 13 | Support retailer outbound fulfillment in the future, while restocking remains primary at launch. |
| 14 | One delivery location per order at launch; multi-location later. |
| 15 | Support immediate and scheduled delivery. |
| 16 | Retailers control staff ordering, approval and payment rules. |
| 17 | Use location \+ editable address \+ landmarks / delivery notes. |
| 18 | Platform owns issue resolution rather than sending customers to suppliers. |
| 19 | Returns and refunds are built into the platform. |
| 20 | Payment options: mobile money, cards and bank transfer. |
| 21 | Unclear requests use a hybrid approach based on history and targeted options. |
| 22 | Normal orders are reviewed before payment; quick checkout can be enabled for repeat orders. |
| 23 | No owned inventory at launch. |
| 24 | Suppliers set their own prices. |
| 25 | Confirm availability before payment. |
| 26 | Supplier non-response triggers alternate sourcing; material changes need customer approval. |
| 27 | Retailers can save preferred products and suppliers; platform may still recommend alternatives. |
| 28 | Suppliers can be rated; platform also uses feedback internally. |
| 29 | Suppliers can apply and the platform can recruit suppliers proactively; approval is required. |
| 30 | Suppliers provide products and prepare them for pickup. |
| 31 | Suppliers have a standard response time. |
| 32 | Customer sees one delivery fee; underlying cost reflects actual logistics complexity. |
| 33 | Revenue model combines supplier commission, logistics margin and service fees where appropriate. |
| 34 | Retailer outbound fulfillment should eventually support delivery-only and pick/pack/delivery. |
| 35 | Retailers can bring orders from existing channels; direct integrations can come later. |
| 36 | Retailers can browse nearby availability or simply request what they need. |
| 37 | Recurring orders are supported; smart recommendations can come later. |
| 38 | No blanket minimum order; selective minimums can apply to costly-to-serve services. |
| 39 | Use platform \+ WhatsApp \+ SMS for important communication. |
| 40 | Cancellation is free before fulfillment; applicable costs disclosed after fulfillment starts. |
| 41 | Buy again supports whole orders or selected items. |
| 42 | Order changes allowed until fulfillment begins. |
| 43 | Retailer onboarding begins simply and becomes more complete over time. |

 

# **20\. Product North Star**

| The product should feel like this: “I simply tell you what my shop needs. You find the products, deal with the suppliers, arrange the transport, keep me updated, and deliver everything to me. I pay once. If something goes wrong, I deal with you.” |
| :---- |

 

That is the experience this PRD is designed to protect. Any future feature should be evaluated against one question: does it make the retailer’s supply and fulfillment journey simpler, more reliable or more useful without giving them more work?

