const eventPrediction = async () => {
    console.log("Iniciando predicción de eventos...");
    console.log("Evento 1 (console.log)")
    setTimeout(() => {
        console.log("Evento 2 (setTimeout)")
    }, 0)
    setImmediate(() => {
        console.log("Evento 3 (setImmediate)")
    })
    await Promise.resolve().then(() => {
        console.log("Evento 4 (Promise.resolve().then())")
    });
    await (async () => {
        console.log("Evento 5 (async function)")
    })();

    // Predicción: Se muestra Evento 1, luego Evento 4, luego Evento 5 y finalmente Evento 2 y 3.
}
eventPrediction();
