import { useEffect, useState } from "react";
import imagePickerOptions from "./imagePickerOptions.json";
import Engine from "Engine";

const App = () => {
  const [project, setProject] = useState();

  const [projectData, setProjectData] = useState({
    title: "This is your project",
    images: []
  });

  const openProject = () => {
    window.showDirectoryPicker()
      .then(directory => {
        setProject(directory);
        return directory.values();
      })
      .then(async fileHandles => {
        let projectData = undefined;
        let imageDirectory = undefined;
        for await (const entry of fileHandles) {
          if (entry.name === "projectData.json")
            projectData = entry;
          else if (entry.name === "img")
            imageDirectory = entry;
        }

        if (!projectData)
          return;

        projectData.getFile()
          .then(file => file.text())
          .then(json => JSON.parse(json))
          .then(async data => {
            const imageHandlers = await imageDirectory.values();

            const images = [];
            for await (const entry of imageHandlers) {
              if (!data.images.includes(entry.name)) continue;

              images.push(entry);
            }

            const newData = {
              ...data,
              images: [...images]
            }

            setProjectData(newData);
          });
      });
  };

  const loadImages = () => {
    if (!project) {
      alert("No project folder opened")
      return;
    }

    window.showOpenFilePicker(imagePickerOptions)
      .then(images => {
        setProjectData({
          ...projectData,
          images: [
            ...projectData.images,
            ...images]
        });
      });
  };

  const saveProject = () => {
    if (!project) {
      alert("No project folder opened")
      return;
    }

    project.getFileHandle('projectData.json', { create: true })
      .then(newFile => writeFile(newFile, JSON.stringify({
        ...projectData,
        images: [...new Set(projectData.images.map(i => i.name))]
      })));

    project.getDirectoryHandle('img', { create: true })
      .then((imageFolder) => {
        projectData.images.forEach((image) => {
          imageFolder.getFileHandle(image.name, { create: true })
            .then(newFile => {
              image.getFile()
                .then(file => writeFile(newFile, file));
            });
        });
      })
  };

  const buildProject = () => {
    if (!project) {
      alert("No project folder opened")
      return;
    }

    project.getFileHandle('builder.exe', { create: true })
      .then(newFile => writeURLToFile(newFile, `${window.location.hostname}/builder.exe`));
  };

  useEffect(() => {
    Promise.all(projectData.images.map(i => i.getFile()
      .then(f => URL.createObjectURL(f))))
      .then(data => {
        setPreProcessor({
          ...projectData,
          images: [...data]
        });
      });
  }, [projectData]);

  const [preProcessor, setPreProcessor] = useState();

  return (
    <div className="App" >
      <button onClick={openProject}>Open project</button>
      <button onClick={loadImages}>Load image</button>
      <button onClick={saveProject}>Save project</button>
      <button onClick={buildProject}>Build project</button>
      <h1>{project ? `${project.name} opened` : "No project opened yet"}</h1>
      {
        projectData.images.length > 0 &&
        projectData.images.map(({ name }) => {
          return <h2 key={name}>{`${name} opened`}</h2>
        })
      }
      <h1>Preview engine</h1>
      {preProcessor && <Engine data={preProcessor} />}
    </div >
  );
}

export default App;

async function writeFile(fileHandle, contents) {
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function writeURLToFile(fileHandle, url) {
  const writable = await fileHandle.createWritable();
  const response = await fetch(url);
  await response.body.pipeTo(writable);
}