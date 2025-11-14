import axios from 'axios';

async function checkOllamaHealth() {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });

    const models = response.data.models || [];
    console.log('✅ Ollama is running');
    console.log(`\nInstalled models (${models.length}):`);

    models.forEach((model: any) => {
      const name = model.name;
      const size = (model.size / 1024 / 1024 / 1024).toFixed(2);
      console.log(`  - ${name} (${size} GB)`);
    });

    // Check for recommended models
    const modelNames = models.map((m: any) => m.name);
    const recommended = ['llama3.1', 'mistral', 'qwen3:4b'];
    const missing = recommended.filter(
      m => !modelNames.some((name: string) => name.includes(m))
    );

    if (missing.length > 0) {
      console.log(`\n⚠️  Missing recommended models: ${missing.join(', ')}`);
      console.log('\nTo install, run:');
      missing.forEach(m => console.log(`  ollama pull ${m}`));
    }
  } catch (error) {
    console.error('❌ Ollama is not running or not accessible');
    console.error('   Please start Ollama with: ollama serve');
    process.exit(1);
  }
}

checkOllamaHealth();
