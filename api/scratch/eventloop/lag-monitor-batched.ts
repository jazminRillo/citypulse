
const lagMonitorBatched = async () => {
    console.log("Iniciando monitor de lag por lotes...");
    const INTERVAL_MS = 100;
    const TOTAL_NUMBERS = 5_000_000;
    const BATCH_SIZE = 500_000; // Process 500,000 numbers at a time
    
    let expectedTime = Date.now() + INTERVAL_MS;
    
    const interval = setInterval(() => {
        const start = Date.now();
        const lag = Math.max(0, start - expectedTime);
        
        console.log(`[Lag Monitor] Delay: ${lag} ms`);
        
        expectedTime = start + INTERVAL_MS;
    }, INTERVAL_MS);

    const sortInBatches = async (numbers: number[], startIndex: number) => {
        if (startIndex >= numbers.length) {
            console.log(`Batched calculation finished.`);
            return;
        }

        const endIndex = Math.min(startIndex + BATCH_SIZE, numbers.length);
        numbers.slice(startIndex, endIndex).sort((a, b) => a - b);

        // Schedule the next batch
        setImmediate(() => sortInBatches(numbers, endIndex));
    };

    setTimeout(() => {
        console.log('Starting batched calculation...');
                
        // Create a large array of random numbers.
        const numbers = Array.from({ length: TOTAL_NUMBERS }, () => Math.random());
        
        const start = Date.now();

        sortInBatches(numbers, 0);
        
        console.log(`Scheduling batches after ${Date.now() - start} ms\n`);
        
    }, 1_000);
    
    setTimeout(() => {
        console.log('\nStarting synchronous 2...');
        clearInterval(interval);
        console.log("----------------------------");
    }, 4_000);
    
    // Stop the monitor after the calculation.
}
lagMonitorBatched();