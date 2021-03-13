
import importer from './importer'

const form = ({setScoreData})=>{
  const { parceFileDataToScoreData } = importer();
  const handleChange = (e)=>{
    const { files } = e.target;
    const scoreDataFetching = parceFileDataToScoreData(files[0]);
    scoreDataFetching.then(e=>{
      console.log(e);
      setScoreData(e);
    });
  }
  return (
    <input type="file" onChange={ handleChange }/>
  )

}

export default form;