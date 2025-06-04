
        // Espera la navegación después del login
        //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        // no es mecesario ya que solo se recarga el frame y no la pagina


          /*if (mainFrame) {
      console.log("Frame mainFrm encontrado.");
  
      // Obtener el HTML dentro del frame
      const frameContent = await mainFrame.evaluate(() => document.body.innerHTML);
      console.log("Contenido del frame:", frameContent.substring(0, 500)); // Solo los primeros 500 caracteres
  
      // Verificar si el select está presente en el DOM
      const selectExists = await mainFrame.evaluate(() => !!document.querySelector('select#adm_channel'));
      console.log("¿Existe el select adm_channel?:", selectExists);
  
      if (selectExists) {
          // Esperar a que el select sea visible antes de interactuar
          await mainFrame.waitForSelector('select#adm_channel', { visible: true, timeout: 10000 });
  
          // Extraer las opciones del dropdown
          const channelOptions = await mainFrame.$$eval('select#adm_channel option', options =>
              options.map(option => option.value)
          );
  
          console.log("Valores del canal disponibles:", channelOptions);
      } else {
          console.log("El select adm_channel no está presente en el DOM.");
      }
  } else {
      console.log("No se encontró el frame mainFrm.");
  }*/

      
    // Imprimir todos los frames disponibles en la página
    //console.log("Frames encontrados:");
    //page.frames().forEach(frame => console.log(frame.url()));


        //console.log("Frames encontrados:");
    //page.frames().forEach(frame => console.log(frame.url()));
    