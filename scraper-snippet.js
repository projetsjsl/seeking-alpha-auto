// SEEKING ALPHA SCRAPER - Version Dashboard Compatible
// INSTRUCTIONS: 
// 1. Remplacez VOTRE_TOKEN_ICI par votre vrai token GitHub
// 2. Copiez ce code dans Chrome DevTools > Sources > Snippets

const CONFIG = {
    GITHUB_TOKEN: 'VOTRE_TOKEN_ICI',
    GITHUB_REPO: 'projetsjsl/seeking-alpha-auto',
    BRANCH: 'main'
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function githubFetch(path, token) {
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${path}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
    const data = await response.json();
    return JSON.parse(atob(data.content));
}

async function pushToGitHub(path, content, message, token) {
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${path}`;
    
    let sha = null;
    try {
        const existing = await fetch(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (existing.ok) {
            const data = await existing.json();
            sha = data.sha;
        }
    } catch (e) {}
    
    const body = {
        message,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
        branch: CONFIG.BRANCH
    };
    if (sha) body.sha = sha;
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) throw new Error('Push failed');
    return response.json();
}

function scrapeCurrentPage() {
    const data = {
        scrapedAt: new Date().toISOString(),
        url: window.location.href,
        companyName: null,
        price: null,
        priceChange: null,
        marketCap: null,
        peRatio: null,
        sector: null,
        dividend: {
            yield: null,
            frequency: null,
            exDivDate: null,
            payoutRatio: null
        },
        quantRating: {
            overall: null,
            valuation: null,
            growth: null,
            profitability: null,
            momentum: null,
            revisions: null
        }
    };

    const match = window.location.href.match(/symbol\/([A-Z]+)/);
    if (!match) throw new Error('Ticker non trouvé dans l URL');
    const ticker = match[1];

    data.companyName = document.querySelector('h1[data-test-id="symbol-name"], h1')?.textContent?.trim();
    data.price = document.querySelector('[data-test-id="symbol-price"], [data-test-id="last-price"]')?.textContent?.trim();
    data.priceChange = document.querySelector('[data-test-id="price-change"]')?.textContent?.trim();

    document.querySelectorAll('[class*="metric"], [class*="key-stat"], [class*="data-item"]').forEach(row => {
        const text = row.textContent.toLowerCase();
        const cells = row.querySelectorAll('td, div, span');
        
        if (cells.length < 2) return;
        const value = cells[cells.length - 1].textContent.trim();
        
        if (text.includes('market cap')) data.marketCap = value;
        if (text.includes('p/e') && !text.includes('forward')) data.peRatio = value;
        if (text.includes('sector')) data.sector = value;
        if (text.includes('dividend yield') || text.includes('div yield')) data.dividend.yield = value;
        if (text.includes('ex-div') || text.includes('ex div')) data.dividend.exDivDate = value;
        if (text.includes('payout ratio')) data.dividend.payoutRatio = value;
        if (text.includes('frequency') && text.includes('div')) data.dividend.frequency = value;
    });

    document.querySelectorAll('[class*="rating"], [class*="grade"], [class*="quant"]').forEach(el => {
        const text = el.textContent.toLowerCase();
        const grade = el.textContent.match(/[A-F][+-]?/)?.[0];
        
        if (!grade) return;
        
        if (text.includes('overall') || el.getAttribute('data-test-id')?.includes('overall')) {
            data.quantRating.overall = grade;
        }
        if (text.includes('valuation') || text.includes('value')) data.quantRating.valuation = grade;
        if (text.includes('growth')) data.quantRating.growth = grade;
        if (text.includes('profitability') || text.includes('profit')) data.quantRating.profitability = grade;
        if (text.includes('momentum')) data.quantRating.momentum = grade;
        if (text.includes('revision') || text.includes('eps')) data.quantRating.revisions = grade;
    });

    console.log(`✓ Scraped ${ticker}:`, data);
    return { ticker, data };
}

async function main() {
    console.log('🚀 Démarrage du scraper...');
    
    try {
        console.log('📥 Chargement des tickers depuis GitHub...');
        const tickersConfig = await githubFetch('tickers.json', CONFIG.GITHUB_TOKEN);
        const tickers = tickersConfig.tickers;
        
        if (tickers.length === 0) {
            console.log('⚠️ Aucun ticker à scraper');
            return;
        }
        
        console.log(`📊 ${tickers.length} tickers à scraper:`, tickers.join(', '));
        
        let allData = {};
        try {
            const existing = await githubFetch('stock_data.json', CONFIG.GITHUB_TOKEN);
            allData = existing.stocks || {};
        } catch (e) {
            console.log('📄 Création de stock_data.json...');
        }
        
        for (let i = 0; i < tickers.length; i++) {
            const ticker = tickers[i];
            console.log(`\n[${i + 1}/${tickers.length}] Scraping ${ticker}...`);
            
            const url = `https://seekingalpha.com/symbol/${ticker}/virtual_analyst_report`;
            window.location.href = url;
            
            await wait(8000);
            
            const { data } = scrapeCurrentPage();
            allData[ticker] = data;
            
            console.log(`✅ ${ticker} scraped successfully`);
            
            await pushToGitHub(
                'stock_data.json',
                {
                    lastUpdate: new Date().toISOString(),
                    stocks: allData
                },
                `Update ${ticker} data`,
                CONFIG.GITHUB_TOKEN
            );
            
            console.log(`💾 ${ticker} data saved to GitHub`);
            
            if (i < tickers.length - 1) {
                console.log('⏳ Attente 3 secondes...');
                await wait(3000);
            }
        }
        
        console.log('\n✅ TERMINÉ! Toutes les données ont été scrapées et sauvegardées');
        console.log('🔄 Actualisez votre dashboard pour voir les données');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

main();
