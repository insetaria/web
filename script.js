var autoScrolling = null;

function smoothScroll(target, duration = 800) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return;

    Array.from(document.querySelectorAll('.menu-item'))
        .filter(item => item.getAttribute('href')?.startsWith('#'))
        .forEach(item => {
            const href = item.getAttribute('href');
            if (href === `#${targetElement.id}`) {
                autoScrolling = item;
                autoScrolling.parentElement.classList.add('active');
            } else {
                item.parentElement.classList.remove('active');
            }
            
        });

    const menuHeight = document.getElementById('menu')?.offsetHeight || 0;
    const targetPosition = Math.round(targetElement.offsetTop - menuHeight);
    const startPosition = Math.round(window.pageYOffset);
    const distance = targetPosition - startPosition;

    if (Math.abs(distance) < 2) {
        activateMenuLink();
        return;
    }

    const adjustedDuration = Math.min(Math.abs(distance) * 0.8, duration);
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeOutQuad(timeElapsed, startPosition, distance, adjustedDuration);
        window.scrollTo(0, run);
        if (timeElapsed < adjustedDuration) {
            requestAnimationFrame(animation);
        } else {
            activateMenuLink(targetElement);
        }
    }

    function easeOutQuad(t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    }

    requestAnimationFrame(animation);

    function activateMenuLink() {
        if(autoScrolling){
            autoScrolling.parentElement.classList.add('active');
            autoScrolling = null;
        }
    }
}

function updateActiveMenu() {
    if(autoScrolling) return;
    const menuItems = Array.from(document.querySelectorAll('.menu-item'))
        .filter(item => item.getAttribute('href')?.startsWith('#'));

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;

    const viewportCenter = scrollY + (windowHeight / 2);

    let closestItem = null;
    let closestDistance = Infinity;

    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        const section = document.querySelector(href);

        if (!section) return;

        const sectionTop = section.offsetTop;
        const sectionCenter = sectionTop + (section.offsetHeight / 2);

        const distance = Math.abs(sectionCenter - viewportCenter);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });

    menuItems.forEach(link => link.parentElement.classList.remove('active'));

    if (closestItem) {
        closestItem.parentElement.classList.add('active');
    }

    const nearBottom = scrollY + windowHeight >= fullHeight - 10;

    if (nearBottom) {
        const anyActive = menuItems.some(i => i.parentElement.classList.contains('active'));
        if (!anyActive) {
            const lastItem = menuItems[menuItems.length - 1];
            if (lastItem) lastItem.parentElement.classList.add('active');
        }
    }
}


function renderMenu() {
    const container = document.getElementById('menu-container') || document.createElement('nav');
    container.id = 'menu';
    container.role = 'navigation';
    container.innerHTML = `
        <div class="logo">
            <img src="./assets/img/logos/logo.png" width="auto" height="35px" alt="Insectaria" title="Insectaria" style="cursor: pointer;display: list-item; text-align: -webkit-match-parent;">
        </div>
        <div class="menu-group">
            <div id="hamburger"><span></span><span></span><span></span></div>
            <ul class="menu-list">
                ${database.menu
                    .map(item => {
                        var attributes = ''
                        if(item.link){
                            const isExternal = item.link.startsWith('http');
                            attributes = isExternal 
                                ? `href="${item.link}" target="_blank" rel="noopener noreferrer"` 
                                : `href="${item.link}"`;
                        }

                        const content = item.text.startsWith("icofont") 
                            ? `<i class="${item.text}"></i>` 
                            : item.text;

                        return `<li><a ${attributes} class="menu-item nolink">${content}</a></li>`;
                    })
                    .join('')}
            </ul>
        </div>
    `;
    
    if (!document.getElementById('menu-container')) {
        document.body.appendChild(container);
    }

    const menuElement = document.getElementById('menu');
    
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.onclick = () => menuElement.classList.toggle('show');
    }

    const menuItems = container.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    smoothScroll(targetElement, 1000);
                }
            } 
            
            if (menuElement) menuElement.classList.remove('show');
        });
    });
    window.addEventListener('scroll', updateActiveMenu);
}

function renderHero(section) {
    const heroSection = document.getElementById('hero') || document.createElement('section');
    heroSection.id = 'hero';
    heroSection.role= 'main';
    if (section.background) heroSection.style.backgroundImage = `url(${section.background})`;
    heroSection.innerHTML = `
        <div class="container">
            <a class="nolink" ${section.link ? `onclick="smoothScroll('${section.link}')"` : ''}>
                <h1>${section.title}</h1>
                <h2>${section.subtitle}</h2>
                <h3>${section.text}</h3>
            </a>
        </div>
    `;
    if (section.font) {
        heroSection.style.color = section.font;
    }
    if (!document.getElementById('hero')) {
        document.body.append(heroSection);
    }
}

function renderAbout(section) {
    const aboutSection = document.getElementById('about') || document.createElement('section');
    aboutSection.id = 'about';
    aboutSection.role= 'contentinfo';
    if (section.background) aboutSection.style.backgroundColor = section.background;
    if (section.font) aboutSection.style.color = section.font;
    aboutSection.innerHTML = `
        <div class="container">
            <div class="about-content">
                ${section.title ? `<h2 class="text-shadow">${section.title}</h2>` : ''}
                <div class="description">
                    <h3>${section.text}</h3>
                </div>
            </div>
            ${ database.methodology && database.methodology.length > 0 ?
            `<div class="methodology-content">
                ${database.methodology.map((methodology, index) => `
                <div class="methodology-entry">
                    <i class="${methodology.icon} methodology-icon"></i>
                    <h3>${methodology.text}</h3>
                </div>
                `).join('')}
            </div>`: ``
            }
        </div>
    `;
    if (section.font) {
        aboutSection.style.color = section.font;
    }
    if (!document.getElementById('about')) {
        document.body.append(aboutSection);
    }
}

function renderServices(section) {
    const servicesSection = document.getElementById('services') || document.createElement('section');
    servicesSection.id = 'services';
    servicesSection.role = 'contentinfo';

    if (section.background){
        servicesSection.style.backgroundImage = `url(${section.background})`;
        servicesSection.classList.add('bg');
    }
    
    servicesSection.innerHTML = `
        <div class="container">
            <div class="grid">
                ${database.services.map((service, index) => `
                    <div class="service-card hover-bg">
                        <div class="card ${(service.modal && service.sheet) ? 'clickable-card hover-shadow' : ''}" 
                             data-index="${index}" 
                             ${service.image ? `style="--hover-bg: url('${service.image}')"` : ``}>
                            <div class="service-info">
                                <div class="icon"><i class="${service.icon} service-icon"></i></div>
                                <h4>${service.title}</h4>
                                <p>${service.text}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${database.services.length > 4 
                ? `<div id="services-trigger" style="display: none;">
                        <a href="${section.link}" class="nolink trigger-button" style="cursor: pointer;">${section.title}</a>
                   </div>` 
                : ``}
        </div> 
    `;

    const cards = servicesSection.querySelectorAll('.service-card');

    // 👉 Añadir comportamiento modal (sin duplicar queries)
    cards.forEach((wrapper, index) => {
        const card = wrapper.querySelector('.card');
        const service = database.services[index];

        if (service.modal && service.sheet) {
            card.style.cursor = 'pointer';

            card.addEventListener('click', () => {
                const modalContent = `
                    <div>
                        ${(service.modalImage || service.image) 
                            ? `<img src="${service.modalImage || service.image}" class="modal-image" style="float:left;">` 
                            : ''
                        }
                        ${service.sheet.split('\n').map(line => `<p>${line.trim()}</p>`).join('')}
                    </div>
                `;
                modal(service.title, modalContent);
            });
        }
    });
    
    if (database.services.length > 5) {
        const triggerContainer = servicesSection.querySelector('#services-trigger');
        const triggerLink = triggerContainer.querySelector('.trigger-button');
        
        let isExpanded = false;

        const updateVisibility = (showAll) => {
            cards.forEach((card, index) => {
                card.style.display = (showAll || index < 5) ? 'block' : 'none';
            });
            triggerLink.textContent = showAll ? section.subtitle : section.title;
            isExpanded = showAll;
        };

        triggerContainer.style.display = 'block';
        updateVisibility(false);

        triggerLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 

            if (!isExpanded) {
                updateVisibility(true);
            } else {
                updateVisibility(false);
                setTimeout(() => {
                    if (section.link) {
                        const target = document.querySelector(section.link);
                        if (target) {
                            smoothScroll(target, 1000);
                        }
                    }
                }, 10); 
            }
        });
    }

    if (section.font) servicesSection.style.color = section.font;
    if (!document.getElementById('services')) document.body.append(servicesSection);
}

function renderPredators(section) {
    const predatorsSection = document.getElementById('predators') || document.createElement('section');
    predatorsSection.id = 'portfolio';
    predatorsSection.role = 'contentinfo';
    predatorsSection.innerHTML = `
        <div class="container">
            <div>
                <h2 class="text-shadow">${section.title}</h2>
                <p>${section.text}</p>
            </div>
            <div class="grid">
                ${database.predators.map((predator, index) => {
                    // Condición original para modal + Nueva condición para página externa
                    const hasModal = predator.modal && (predator.sheet || predator.price);
                    const hasExternalPage = predator.page === true && predator.content;
                    const isClickable = hasModal || hasExternalPage;

                    return `
                    <div class="predator-card">
                        <div class="card ${isClickable ? 'clickable-card' : ''}" data-index="${index}">
                            ${predator.image ? `<div class="predator-image"><img src="https://www.insectaria.com/${predator.image}" alt="${predator.name}"></div>` : ''}
                            <div class="predator-info">
                                <h3><i>${predator.name}</i></h3>
                                <h4>${predator.state}</h4>
                                <p>${predator.description}</p>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `;

    if (section.font) predatorsSection.style.color = section.font;
    if (!document.getElementById('predators')) document.body.append(predatorsSection);

    const cards = predatorsSection.querySelectorAll('.card.clickable-card');
    cards.forEach(card => {
        const index = card.getAttribute('data-index');
        const predator = database.predators[index];

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            if (predator.modal && (predator.price || predator.sheet)) {
                let priceTable = '';
                if (predator.price) {
                    const rows = predator.price.trim().split('\n');
                    const tableRows = rows.map(row => {
                        const cells = row.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
                        return `<tr>${cells}</tr>`;
                    }).join('');
                    priceTable = `
                        <table class="price-table">
                            <tbody class="price-table-body">
                                ${tableRows}
                            </tbody>
                        </table>`;
                }
                const modalContent = `
                    <div>
                        <div class="predator-graphic-info">
                            <img src="https://insectaria.com/${predator.image}" class="modal-image">
                            ${priceTable}
                        </div>
                        ${predator.sheet ? predator.sheet.split('\n').map(line => `<p>${line.trim()}</p>`).join('') : ''}
                    </div>
                `;
                modal(`<i>${predator.name}</i> - ${predator.state}`, modalContent);

            } 
            else if (predator.page === true && predator.content) {
                const formattedName = predator.name.toLowerCase().trim().replace(/\s+/g, '-');
                const url = `https://insectaria.com/info/predator/${formattedName}`;
                window.open(url, '_blank');
            }
        });
    });
}

function renderProjects(section) {
    const projectsSection = document.getElementById('projects') || document.createElement('section');
    projectsSection.id = 'projects';
    projectsSection.role = 'contentinfo';
    projectsSection.classList.add('bg');
    
    if (section.background) projectsSection.style.backgroundImage = `url(${section.background})`;
    if (section.font) projectsSection.style.color = section.font;

    projectsSection.innerHTML = `
        <div class="container">
            <div class="grid">
                ${database.projects.map(project => {
                    const hasLink = project.link && project.link.trim() !== "";
                    const cardContent = `
                        <div class="card">
                            <div class="project-info">
                                <h3>${project.title}</h3>
                                <p>${project.description}</p>
                                ${hasLink ? '<p>(<span>Ir al artículo</span>)</p>' : ""}
                            </div>
                        </div>
                    `;
                    return `
                        <div class="project-card">
                            ${hasLink 
                                ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="nolink">${cardContent}</a>` 
                                : cardContent
                            }
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    if (!document.getElementById('projects')) {
        document.body.append(projectsSection);
    }

    const projectCards = projectsSection.querySelectorAll('.project-card');
    let isExpanded = false;

    const updateProjectVisibility = (showAll) => {
        projectCards.forEach((card, index) => {
            card.style.display = (showAll || index < 3) ? 'block' : 'none';
        });
        const triggerButton = document.getElementById('projects-trigger');
        if (triggerButton) {
            triggerButton.textContent = showAll ? section.subtitle || "Mostrar menos" : section.title || "Mostrar más";
        }
        isExpanded = showAll;
    };

    if (database.projects.length > 3) {
        const container = projectsSection.querySelector('.container');
        const triggerHTML = `
            <div id="projects-trigger-container" style="text-align:center; margin-top:1rem;">
                <div id="projects-trigger" class="trigger-button card" style="cursor:pointer;">${section.title}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', triggerHTML);

        updateProjectVisibility(false);

        const triggerButton = document.getElementById('projects-trigger');
        triggerButton.addEventListener('click', () => {
            updateProjectVisibility(!isExpanded);
            if (!isExpanded) {
                const target = document.getElementById('projects');
                if (target) smoothScroll(target, 800);
            }
        });
    }
}

function renderIdi(section) {
    let idiSection = document.getElementById('idi');
    if (!idiSection) {
        idiSection = document.createElement('section');
        idiSection.id = 'idi';
        idiSection.role = 'contentinfo';
        document.body.appendChild(idiSection);
    }

    idiSection.innerHTML = `
        <div class="container">
            <div>
                <h2 class="text-shadow">${section.title}</h2>
                <p>${section.text}</p>
            </div>
            <div class="grid" id="idi-grid">
                ${database.idi.map((idi, index) => {
                    const hasLink = idi.link && idi.link.trim() !== "";
                    const hasModal = idi.modal && idi.sheet && idi.sheet.trim() !== "";

                    const styles = ((hasLink || hasModal) && idi.background) ? `style="--hover-bg: url('${idi.background.replace(/\\/g, '/')}');"` : '';
                    const classes = `class="card${(hasLink || hasModal) ? ' hover-shadow':''}"`;
                    const cardInner = `
                        <div ${classes} ${styles}>
                            <h3>${idi.title}</h3>
                            ${idi.image ? `<img src="${idi.image}" class="idi-item-image">` : ''}
                            <p>${idi.description || ''}</p>
                            ${(hasLink && !hasModal) ? '<p>(<span>Ir al artículo</span>)</p>' : ''}
                        </div>
                    `;
                    //${(hasLink && !hasModal) ? '<p>(<span>Ir al enlace</span>)</p>' : (hasLink ? `<p>(<a href="${idi.link}" target="_blank" rel="noopener noreferrer">Ir al enlace</a>)</p>` : '')}


                    return `
                        <div class="idi-card hover-bg" data-index="${index}">
                            ${(hasLink && !hasModal) ? `<a href="${idi.link}" target="_blank" rel="noopener noreferrer" class="nolink">${cardInner}</a>` : cardInner}
                        </div>
                    `;
                }).join('')}
            </div>
            ${database.idi.length > 3 
                ? `<div id="idi-trigger-container" style="text-align:center; margin-top: 1rem;">
                        <div id="idi-trigger" class="trigger-button card">Mostrar más</div>
                   </div>` 
                : ''}
        </div>
    `;

    const idiCards = idiSection.querySelectorAll('.idi-card');
    let isExpanded = false;

    const updateVisibility = (showAll) => {
        idiCards.forEach((card, index) => {
            card.style.display = (showAll || index < 3) ? 'block' : 'none';
        });
        const triggerButton = document.getElementById('idi-trigger');
        if (triggerButton) {
            triggerButton.textContent = showAll ? "Mostrar menos" : "Mostrar más";
        }
        isExpanded = showAll;
    };

    if (database.idi.length > 3) {
        updateVisibility(false);
        const triggerButton = document.getElementById('idi-trigger');
        triggerButton.addEventListener('click', () => {
            updateVisibility(!isExpanded);
            if (isExpanded) {
                const target = document.getElementById('idi');
                if (target) smoothScroll(target, 800);
            }
        });
    }

    idiCards.forEach(card => {
        const index = parseInt(card.getAttribute('data-index'), 10);
        const idi = database.idi[index];
        if (idi.sheet) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;

                const modalContent = `
                    <div>
                        ${idi.image ? `<img src="${idi.image}" class="modal-image" style="float: left;">` : ''}
                        ${idi.sheet.split('\n').map(line => `<p>${line.trim()}</p>`).join('')}
                        ${idi.link ? `<p>(<a href="${idi.link}" target="_blank" rel="noopener noreferrer">Ir al artículo</a>)</p>` : ''}
                    </div>
                `;
                modal(idi.title, modalContent);
            });
        }
    });
}

function renderContact(section) {
    const contactSection = document.getElementById('contact') || document.createElement('footer');
    contactSection.id = 'contact';
    contactSection.role = 'contentinfo';
    contactSection.classList.add('bg');
    if (section.background) contactSection.style.backgroundImage = `url(${section.background})`;
    if (section.font) contactSection.style.color = section.font;

    contactSection.innerHTML = `
        <div class="container">
            <a target="_blank" class='nolink' ${section.link ? `href='${section.link}'`:''}>
                <div class="icon"><i class="icofont-envelope"></i></div>
                <div class="contact-content">
                    ${section.title ? `<h2>${section.title}</h2>` : ''}
                    ${section.subtitle ? `<h3>${section.subtitle}</h3>`: ''}
                    ${section.text ? `<h3>${section.text}</h3>`: ''}
                </div>
            </a>
        </div>
    `;
    if (section.font) {
        contactSection.style.color = section.font;
    }
    if (!document.getElementById('contact')) {
        document.body.append(contactSection);
    }
}

function renderFooter(section) {
    if (!database.footer) return;

    const footerSection = document.getElementById('footer') || document.createElement('section');
    footerSection.id = 'footer';
    footerSection.role = 'contentinfo';

    footerSection.style.backgroundColor = section.background;
    footerSection.style.color = section.font;

    footerSection.innerHTML = `
        <div class="container">
            ${section.title ? `<h2 class="text-shadow">${section.title}</h2>` : ''}
            <div>
                <img src="./assets/img/logos/logo.png" width="auto" height="35px" alt="Insectaria" title="Insectaria" style="max-height: 60px; height: auto;aspect-ratio: 6 / 1; max-width: calc(100% - 1rem);">
            </div>
            ${section.text ? `<p>${section.text}</p><hl/><hr>` : ''}
            <div class="footer-list">
                ${database.footer.map(collab => `
                    <div class="footer-row">
                        ${collab.link 
                            ? `<a href="${collab.link}" target="_blank" rel="noopener noreferrer" class="nolink">`
                            : ''
                        }
                        
                        ${collab.image 
                            ? `<img src="${collab.image}" alt="${collab.title}" class="footer-logo">`
                            : ''
                        }

                        ${collab.title
                            ? `<p class="footer-title">${collab.title || ''}</p>`
                            : ''
                        }

                        ${collab.description 
                            ? `<p class="footer-description">${collab.description}</p>`
                            : ''
                        }

                        ${collab.link ? `</a>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    if (!document.getElementById('footer')) {
        document.body.append(footerSection);
    }
}

function renderModal() {
    if (document.getElementById('modal')) return;
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.role = 'modal';
    modal.classList.add('hidden');
    modal.innerHTML = `
        <div class="modal-window">
            <button class="modal-close">✖</button>
            <h2 class="modal-title text-shadow"></h2>
            <hr>
            <div class="modal-content" id="modal-content"></div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
}
function modal(title, htmlContent) {
    const modal = document.getElementById('modal');
    document.querySelectorAll('.modal-title').forEach(item => {
        item.innerHTML = title;
        applyTextShadow(item);
    });
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = htmlContent;
    modalContent.scrollTop = 0;
    modal.classList.remove('hidden');
    scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
}
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}
function applyTextShadow(el) {
    const old = el.querySelector('.text-shadow-clone');
    if (old) old.remove();
    const clone = el.cloneNode(true);
    clone.classList.remove('text-shadow');
    clone.classList.add('text-shadow-clone');
    clone.removeAttribute('id');
    el.appendChild(clone);
}

function renderSections() {
    
    renderMenu();
    
    const heroData = database.sections.find(s => s.id === "#hero");
    if (heroData) renderHero(heroData);

    const aboutData = database.sections.find(s => s.id === "#about");
    if (aboutData) renderAbout(aboutData);

    const servicesData = database.sections.find(s => s.id === "#services");
    if (servicesData) renderServices(servicesData);

    const portfolio = database.sections.find(s => s.id === "#portfolio");
    if (portfolio && database.predators) renderPredators(portfolio);

    const projects = database.sections.find(s => s.id === "#projects");
    if (projects) renderProjects(projects);

    const idi = database.sections.find(s => s.id === "#i+d+i");
    if (idi) renderIdi(idi);

    const contactData = database.sections.find(s => s.id === "#contact");
    if (contactData) renderContact(contactData);

    const footer = database.sections.find(s => s.id === "#footer");
    if (footer && database.footer) renderFooter(footer);

    document.querySelectorAll(".text-shadow").forEach(item => {
        applyTextShadow(item);
    });

    renderModal();
}

function isEnabled(dateStr, filterFutureDates = false){
    if (!dateStr || dateStr == "") return false;
    var enabled = true;
    if(filterFutureDates == true){
        const activationDate = new Date(dateStr.split('/').reverse().join('-'));
        enabled = activationDate <= new Date();
    }
    return enabled;
};

function debug(data){
    console.log("database:", data);
    document.body.innerHTML = `
        <pre id="debug"></pre>
    `;
    document.getElementById("debug").textContent = JSON.stringify(data, null, 2);
}

function cleanAppData() {
  const original = window.appData;
  if (!original) return null;
  const result = {};
  for (const key in original) {
    if (Object.prototype.hasOwnProperty.call(original, key)) {
      const value = original[key];
      if (Array.isArray(value)) {
        result[key] = value
          .filter(item => {
            return !item.hasOwnProperty('enabled') || isEnabled(item.enabled, true);
          })
          .map(item => ({ ...item }));
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

function waitForAppDataAndDOM({ timeout = 10000, interval = 20 } = {}) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        function check() {
            if (document.body && window.appData !== undefined && window.appData !== null) {
                return resolve(window.appData);
            }

            if (Date.now() - start > timeout) {
                return reject(new Error("Timeout esperando DOM o database"));
            }

            setTimeout(check, interval);
        }
        check();
    });
}

async function load() {
    try{
        const params = new URLSearchParams(window.location.search);
        const gid = params.get("gid");
        const script = document.createElement("script");
        if (gid) {
            window.APP_GID = gid;
            script.src = "./prototype.js";
        } else {
           
            script.src = "./database.js";
             /*
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
            document.addEventListener('selectstart', function(e) {
                e.preventDefault();
            });
            document.addEventListener('dragstart', function(e) {
                e.preventDefault();
            });
            */
        }
        document.head.appendChild(script);
        await waitForAppDataAndDOM();
        window.database = cleanAppData();
        //debug(window.database);
        renderSections();
    }catch(err){
        console.error(err);
        document.body.innerHTML = `<div style="text-align:center;"><h2>Error al cargar datos, vuelve más tarde.</h2><h3>info@insectaria.com</h3></div>`;
    }
}

load();