const lagMonitor = async () => {
    console.log("Iniciando monitor de lag...");
    const INTERVAL_MS = 100;
    
    let expectedTime = Date.now() + INTERVAL_MS;
    
    const interval = setInterval(() => {
        const start = Date.now();
        const lag = Math.max(0, start - expectedTime);
        
        console.log(`[Lag Monitor] Delay: ${lag} ms`);
        
        expectedTime = start + INTERVAL_MS;
    }, INTERVAL_MS);
    
    setTimeout(() => {
        console.log('\nStarting synchronous calculation...');
        
        const start = Date.now();
        
        // Create a large array of random numbers.
        const numbers = Array.from({ length: 5_000_000 }, () => Math.random());
        
        // Sorting is synchronous and blocks the event loop.
        numbers.sort((a, b) => a - b);
        
        console.log(`Calculation finished in ${Date.now() - start} ms\n`);
        
    }, 1_000);
    
    setTimeout(() => {
        console.log('\nStarting synchronous 2...');
        clearInterval(interval);
        console.log("----------------------------");
    }, 5_000);
    
    // Stop the monitor after the calculation.
}

lagMonitor();
