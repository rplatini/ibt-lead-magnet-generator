# Ejercicio de entrevista para Product Engineer

## Glosario / contexto de negocio

Este ejercicio incluye conceptos de ventas y marketing. No esperamos conocimiento previo en estas áreas.

**Outbound sales:** estrategia comercial en la que una empresa inicia activamente conversaciones con potenciales clientes, en lugar de esperar que lleguen por su cuenta. Ejemplos: mensajes por LinkedIn, emails comerciales, llamadas.

**Outreach:** la acción concreta de contactar potenciales clientes dentro de una estrategia de outbound.

**Lead:** una persona o empresa que podría convertirse en cliente. En este ejercicio, cuando hablamos de lead, nos referimos simplemente al destinatario potencial de una acción comercial.

**Lead magnet:** un recurso de valor que se ofrece a un lead para generar interés y demostrar capacidad antes de intentar vender. El objetivo es aportar valor primero. Ejemplos: auditorías gratuitas, diagnósticos, reportes personalizados, herramientas gratuitas o pruebas temporales de producto.

**Lead magnet personalizado:** un lead magnet adaptado específicamente a un lead concreto. Por ejemplo, en lugar de enviar una guía genérica sobre ventas, generar un análisis específico sobre la empresa del lead.

## Objetivo del Ejercicio

En Inbound Tools buscamos product engineers.

Para este rol evaluamos tres capacidades principales: capacidad técnica, capacidad de producto y capacidad de comunicación.

Esperamos que una persona pueda entender sistemas existentes, modificarlos y mejorarlos de forma pragmática..

Buscamos personas capaces de entender quién es el usuario, cuál es el problema real a resolver, qué solución genera valor, cómo reducir complejidad innecesaria y cómo iterar a partir de feedback. Gran parte del trabajo implica tomar decisiones con información incompleta y priorizar correctamente. No buscamos perfiles que simplemente ejecuten tareas definidas.

También evaluamos comunicación y colaboración: claridad para explicar decisiones, justificar tradeoffs y trabajar efectivamente con otras personas.

Se nos ocurrió que la mejor manera de evaluar estas habilidades es con un ejercicio lo más parecido al trabajo del día a día, para que sepas cómo sería trabajar con nosotros y viceversa. Este es el tipo de problema que te enfrentarás constantemente.

## Contexto: Problema de negocio

Nuestros clientes utilizan LinkedIn como canal comercial. Uno de los principales problemas del canal es que está saturado de outreach genérico y de bajo valor. Mensajes impersonales, pitches irrelevantes y poco contexto generan una mala experiencia para quienes los reciben.

Nuestra postura es que el outreach debería aportar valor antes de intentar vender.

Una forma efectiva de hacerlo es mediante lead magnets.

Dependiendo del caso, un lead magnet puede ayudar a descubrir un problema que el usuario no sabía que tenía, resolver una parte del problema o resolver temporalmente el problema completo.

Hemos observado que los lead magnets personalizados suelen funcionar mejor, porque el valor percibido aumenta cuando el contenido es relevante para la persona o empresa que lo recibe.

El problema es que crear este tipo de lead magnets requiere combinar criterio de producto, diseño, automatización, personalización y capacidad técnica. La mayoría de nuestros clientes entienden el valor conceptual, pero no tienen las herramientas o capacidades para ejecutarlo. Los 3 ejemplos de lead magnets:

**Descubrir un problema que el lead no sabía que tenía:**
Ejemplo (salud / biotech): una clínica que ofrece programas de salud metabólica brinda una evaluación gratuita donde una persona completa algunos datos básicos y recibe un diagnóstico preliminar sobre posibles riesgos o indicadores de salud.
Valor: el lead descubre un problema o una oportunidad que no había identificado.

**Resolver una parte del problema:**
Ejemplo (legal): un estudio jurídico especializado en compliance ofrece una herramienta que revisa automáticamente ciertos documentos o respuestas y detecta riesgos regulatorios básicos.
Valor: ayuda a resolver una parte del problema, pero no reemplaza el servicio completo.

**Resolver temporalmente el problema completo:**
Ejemplo (chocolatería): una fábrica de chocolates da pruebas gratuitas en un supermercado de su nuevo producto chocochip con maní.
Valor: el problema queda resuelto completamente, pero solo de forma temporal. La persona quiere la tableta de chocolate entera.

## Lo que ya está hecho

Construimos un MVP interno llamado Lead Magnet Generator.

El objetivo del producto es ayudar a nuestros clientes a generar lead magnets personalizados.

La lógica general es simple: el usuario define qué problema quiere resolver, para qué tipo de lead, y qué tipo de valor quiere entregar. A partir de eso, el sistema genera una base reusable que luego puede convertirse en instancias personalizadas para leads específicos.

Pensando en OOP, Podemos pensar al template como la Clase y al lead magnet como una instancia (objeto).

El producto ya existe y es funcional, pero fue construido rápidamente como MVP. Tiene limitaciones de UX, puntos de fricción, decisiones de producto mejorables, outputs inconsistentes y limitaciones técnicas. Esto es intencional.

Una parte importante del trabajo en este rol no consiste en construir productos desde cero, sino en tomar productos existentes, entender sus limitaciones y mejorarlos significativamente.

## El ejercicio

Se te dará acceso al producto existente y a su código fuente.

Tu objetivo es analizar el producto y mejorarlo.

La primera parte del ejercicio consiste en comprender qué problema intenta resolver el producto, cómo funciona actualmente, qué decisiones parecen haber sido tomadas, qué tradeoffs existen y qué limitaciones identificás. Podés usar AI u otras herramientas para acelerar este proceso. No evaluamos trabajo manual innecesario; sí evaluamos comprensión y criterio.

La segunda parte consiste en proponer e implementar mejoras.

Las mejoras pueden estar orientadas a UX, onboarding, claridad del flujo, reducción de fricción, automatización, calidad del output, mejoras funcionales o mejoras técnicas que impacten directamente en la experiencia del usuario.

No esperamos que rehagas el producto completo. Esperamos que priorices correctamente y tomes decisiones razonables.

**Importante:** Podés pelotear con el equipo todo lo que quieras. Como lo harías en el trabajo del día a día.

## Evaluación

Vamos a evaluar varias dimensiones.

**Usabilidad:** si una persona que nunca vio el producto puede entender qué hace, completar el flujo sin asistencia, comprender qué está ocurriendo en cada etapa y llegar al resultado esperado.

**Calidad del output:** si el lead magnet generado es útil, genera valor real y sería razonablemente utilizable en un contexto comercial real.

**Criterio de producto:** qué problemas detectaste, qué decidiste resolver, por qué priorizaste esos cambios y si esas decisiones mejoran realmente el producto.

**Ejecución técnica:** calidad de implementación, pragmatismo técnico, balance entre velocidad y complejidad, y criterio de ingeniería.

**Comunicación:** durante la revisión final deberás explicar qué cambiaste, por qué, qué alternativas consideraste, qué tradeoffs aceptaste y qué harías después.

## Revisión final

La evaluación incluirá una walkthrough del producto y una conversación sobre tus decisiones.

También es posible que hagamos pruebas de uso en vivo para observar cómo interactúa una persona nueva con el producto luego de tus cambios.

## Objetivo

Este ejercicio no busca evaluar únicamente la capacidad de implementación.

Busca evaluar si podés tomar un producto existente, entender el problema que intenta resolver, identificar oportunidades de mejora y ejecutar cambios con criterio técnico y de producto.
